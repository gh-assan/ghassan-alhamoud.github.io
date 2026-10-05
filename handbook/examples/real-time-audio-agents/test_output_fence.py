"""Adversarial schedules for the chapter's pure presentation decision model."""

from dataclasses import replace
import unittest

from output_fence import Decision, SpeechItem, View, decide_output


class OutputFenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.current = View(3, 4, {"r7": 2, "r3": 1})
        self.item = SpeechItem(3, 4, "r7", 2, True)

    def test_overlapping_valid_results_remain_eligible(self) -> None:
        self.assertEqual(decide_output(self.current, self.item), Decision.PLAY)
        second = replace(self.item, request_id="r3", revision=1)
        self.assertEqual(decide_output(self.current, second), Decision.PLAY)

    def test_barge_in_drops_prepared_audio_without_changing_requests(self) -> None:
        interrupted = replace(self.current, generation=5, user_speaking=True)
        self.assertEqual(decide_output(interrupted, self.item), Decision.DROP)
        self.assertEqual(dict(interrupted.request_revisions), {"r7": 2, "r3": 1})

    def test_late_check_success_does_not_revive_old_audio(self) -> None:
        pending_check = replace(self.item, grounded=False)
        interrupted = replace(self.current, generation=5)
        late_verified = replace(pending_check, grounded=True)
        self.assertEqual(decide_output(interrupted, late_verified), Decision.DROP)

    def test_pending_result_can_be_rendered_into_new_generation(self) -> None:
        interrupted = replace(self.current, generation=5)
        fresh_attempt = replace(self.item, generation=5)
        self.assertEqual(decide_output(interrupted, self.item), Decision.DROP)
        self.assertEqual(decide_output(interrupted, fresh_attempt), Decision.PLAY)

    def test_revocation_invalidates_prepared_private_output(self) -> None:
        revoked = replace(self.current, access_epoch=1)
        late_verified = replace(self.item, grounded=True)
        self.assertEqual(decide_output(revoked, late_verified), Decision.DROP)

    def test_wait_then_correction_rejects_old_result(self) -> None:
        busy = replace(self.current, user_speaking=True)
        self.assertEqual(decide_output(busy, self.item), Decision.WAIT)
        corrected = replace(self.current, request_revisions={"r7": 3, "r3": 1})
        self.assertEqual(decide_output(corrected, self.item), Decision.DROP)

    def test_correction_does_not_supersede_unrelated_ticket(self) -> None:
        corrected = replace(self.current, request_revisions={"r7": 3, "r3": 1})
        other = replace(self.item, request_id="r3", revision=1)
        self.assertEqual(decide_output(corrected, other), Decision.PLAY)

    def test_explicit_presentation_suppression_preserves_durable_result(self) -> None:
        durable_results = {"r7": {"status": "completed", "receipt": "e7"}}
        suppressed = replace(self.current, request_revisions={"r3": 1})
        self.assertEqual(decide_output(suppressed, self.item), Decision.DROP)
        self.assertEqual(durable_results["r7"]["receipt"], "e7")

    def test_reconnect_rejects_old_owner_even_if_generation_matches(self) -> None:
        reconnected = replace(self.current, owner_epoch=4)
        self.assertEqual(decide_output(reconnected, self.item), Decision.DROP)

    def test_new_owner_current_output_is_eligible(self) -> None:
        reconnected = replace(self.current, owner_epoch=4)
        new_item = replace(self.item, owner_epoch=4)
        self.assertEqual(decide_output(reconnected, new_item), Decision.PLAY)

    def test_user_speech_waits_and_rechecks_after_pause(self) -> None:
        busy = replace(self.current, user_speaking=True)
        self.assertEqual(decide_output(busy, self.item), Decision.WAIT)
        self.assertEqual(decide_output(self.current, self.item), Decision.PLAY)

    def test_assistant_playback_keeps_second_result_waiting(self) -> None:
        busy = replace(self.current, assistant_playing=True)
        second = replace(self.item, request_id="r3", revision=1)
        self.assertEqual(decide_output(busy, second), Decision.WAIT)

    def test_unsupported_claim_is_dropped_even_at_a_pause(self) -> None:
        ungrounded = replace(self.item, grounded=False)
        self.assertEqual(decide_output(self.current, ungrounded), Decision.DROP)

    def test_unrecognized_request_cannot_play(self) -> None:
        foreign = replace(self.item, request_id="foreign")
        self.assertEqual(decide_output(self.current, foreign), Decision.DROP)

    def test_future_revision_is_also_rejected(self) -> None:
        future = replace(self.item, revision=3)
        self.assertEqual(decide_output(self.current, future), Decision.DROP)

    def test_external_mapping_mutation_cannot_change_snapshot(self) -> None:
        mapping = {"r7": 2}
        snapshot = View(3, 4, mapping)
        mapping["r7"] = 3
        self.assertEqual(decide_output(snapshot, self.item), Decision.PLAY)
        with self.assertRaises(TypeError):
            snapshot.request_revisions["r7"] = 4

    def test_invalid_fence_values_fail_closed_at_construction(self) -> None:
        for value in (-1, True, "4", None):
            with self.subTest(value=value), self.assertRaises(ValueError):
                replace(self.item, generation=value)

    def test_string_false_is_not_a_verification_verdict(self) -> None:
        with self.assertRaises(ValueError):
            replace(self.item, grounded="false")


if __name__ == "__main__":
    unittest.main()
