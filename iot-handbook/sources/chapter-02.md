# IOT-002 primary source register

Access/evidence date: **2026-10-12**. Read the relevant source bodies, not only search snippets. No copied diagrams, tables, standards text, hardware measurements or source PDFs are bundled. Chapter terminology is paraphrased; worked models and figures are original constructed examples.

## International metrology vocabulary

**VIM3:** JCGM 200:2012, third edition of the International Vocabulary of Metrology (2008 edition with minor corrections). The BIPM annotated web edition adds dated informative annotations. These annotations are not new normative clauses. Edition identified through the [JCGM publications catalogue](https://www.bipm.org/en/committees/jc/jcgm/publications) and the linked VIM3 entries. Do not claim this chapter covers every metrology standard or provides conformity guidance.

Each URL below was opened and its relevant definition/notes read. No unresolved correction affecting these scoped paraphrases was identified on the inspected entry pages; this is not an exhaustive standards-family audit.

| ID | Entry and exact source | Role / supported claims | Limit |
|---|---|---|---|
| S01 | [VIM3 2.3: measurand](https://jcgm.bipm.org/vim/en/2.3.html) | C01; intended quantity, specification and measuring-system effects | Application location/timescale requirements are author examples |
| S02 | [VIM3 3.7: measuring transducer](https://jcgm.bipm.org/vim/en/3.7.html), [3.8: sensor](https://jcgm.bipm.org/vim/en/3.8.html) | C02; scoped vocabulary | Whole-module product usage is distinguished from element definition |
| S03 | [VIM3 4.12: sensitivity](https://jcgm.bipm.org/vim/en/4.12.html) | C03; input/output change relationship | No specific transducer sensitivity claimed |
| S04 | [VIM3 4.14: resolution](https://jcgm.bipm.org/vim/en/4.14.html) | C04; perceptible change, operating dependence | Ideal converter arithmetic is separate |
| S05 | [VIM3 2.15: precision](https://jcgm.bipm.org/vim/en/2.15.html) | C05; repeat results under specified conditions | Four teaching values do not establish a population property |
| S06 | [VIM3 2.14: trueness](https://jcgm.bipm.org/vim/en/2.14.html) | C05; long-run mean/reference distinction | Actual reference carries uncertainty |
| S07 | [VIM3 2.13: accuracy](https://jcgm.bipm.org/vim/en/2.13.html) | C05; qualitative concept, relation to error | Datasheet labels require reading actual specification scope |
| S08 | [VIM3 2.26: uncertainty](https://jcgm.bipm.org/vim/en/2.26.html) | C06; values attributed from available information | Not an all-fault numerical guarantee |
| S09 | [VIM3 2.39: calibration](https://jcgm.bipm.org/vim/en/2.39.html), [3.11: adjustment](https://jcgm.bipm.org/vim/en/3.11.html), [2.53: correction](https://jcgm.bipm.org/vim/en/2.53.html), [2.44: verification](https://jcgm.bipm.org/vim/en/2.44.html) | C07; calibration relationship, correction versus adjustment, usual recalibration after adjustment | Additional entries read 2026-10-12 for v1.1; two-point line remains an assumed teaching model |
| S10 | [VIM3 2.41: traceability](https://jcgm.bipm.org/vim/en/2.41.html) | C08; documented calibration chain with uncertainty; adequacy limit | Software provenance is a separate concept |
| S11 | [VIM3 4.23: step response time](https://jcgm.bipm.org/vim/en/4.23.html) | C10; input step and specified settling criterion | First-order time constant is not a universal response specification |
| S12 | [VIM3 4.21: instrumental drift](https://jcgm.bipm.org/vim/en/4.21.html) | C14; changing metrological properties, not input/influence change | No interval or drift rate recommended |
| S21 | [VIM3 2.52: influence quantity](https://jcgm.bipm.org/vim/en/2.52.html) | C18; narrow VIM definition, examples, Note 2 on broader GUM usage | Read 2026-10-12 for v1.2 |
| S20 | [VIM3 2.16: measurement error](https://jcgm.bipm.org/vim/en/2.16.html) | C06; measured-minus-reference definition | Reference comparison is distinct from instrument faults |

## Uncertainty methods

**NIST TN1297:** B. N. Taylor and C. E. Kuyatt, Guidelines for Evaluating and Expressing the Uncertainty of NIST Measurement Results, **1994 edition**. [Official entry point](https://www.nist.gov/pml/nist-technical-note-1297). The inspected website identifies the historical edition; page-update dates are not new editions of the technical note. Use for a scoped introduction, not as an exhaustive claim about current metrology guidance. Source bodies and formula conditions checked.

| ID | Exact source / sections | Role / supported claims | Limit |
|---|---|---|---|
| S13 | [TN1297 §3, Type A](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-3-type-evaluation-standard-uncertainty) | C11, C12; statistical evaluation and independent-mean reasoning | The chapter states its independent-noise assumption |
| S14 | [TN1297 §4, Type B](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-4-type-b-evaluation-standard-uncertainty) | C12; information-based evaluation, uniform distribution example | Bounds do not automatically establish a uniform distribution |
| S15 | [TN1297 §5, combined uncertainty](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-5-combined-standard-uncertainty) | C12; correction uncertainty, standard uncertainties, covariance | Unit sensitivity coefficients and uncorrelated inputs explicitly assumed |
| S16 | [TN1297 §6, expanded uncertainty](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-6-expanded-uncertainty) | C13; coverage factor and conditions for approximate coverage | k=2 is not an unconditional 95% statement |
| S17 | [JCGM 100:2008/Amd.1:2026, Nonlinearity in measurement models](https://doi.org/10.59161/PPDI3267), pp. 1, amendments to 4.1.4 and H.1.7. DOI re-resolved 2026-10-12 to bipm.org/doi/10.59161/jcgm100-amd-2026 | C12; nonlinear-model limitation and methods | Read amendment text from BIPM catalogue; no nonlinear calculation supplied. Publication catalogue checked 2026-10-12. |

## Sensor and sampling mechanisms

| ID | Source / edition / exact URL | Relevant text and role | Limit |
|---|---|---|---|
| S18 | Analog Devices, **Anti-Aliasing Basics Using Switch-Capacitor Filters**, 2005-04-12; [application note](https://www.analog.com/en/resources/technical-articles/antialiasing-basics-using-switchcapacitor-filters.html) | Introductory aliasing and input-filter discussion; C09 | Vendor engineering explanation, not normative standard. Converter implementation discussion not generalized to a selected board; no part recommended. Page read 2026-10-12. |
| S19 | Texas Instruments, **Precise Temperature Measurements With the TMP116 and TMP117**, **SNOA986A**, April 2018, revised August 2019; [official PDF](https://www.ti.com/lit/pdf/snoa986a) | §§10–11 self-heating and environment thermal resistance; C10 | Actual PDF header establishes edition despite search-result recency. Only the installation/self-heating mechanism is used. No figure or device measurement reproduced; no hardware procedure or operating value extrapolated. Read 2026-10-12. |

## Sensing principles (added v1.3)

Each document was downloaded or opened on 2026-10-12 and the cited sections read. Vendor documents support mechanisms and the stated device figures only; no part is recommended and no device figure is generalized.

| ID | Source / edition / exact URL | Relevant text and role | Limit |
|---|---|---|---|
| S22 | TI, **A Basic Guide to RTD Measurements**, SBAA275A, June 2018, revised March 2023; [PDF](https://www.ti.com/lit/pdf/sbaa275) | §1: platinum RTD, Pt100 = 100 Ω at 0 °C; §1.1 IEC 60751 Callendar–Van Dusen coefficients; §1.3 two-, three-, four-wire lead effects; §1.5.2 self-heating from excitation. C20, C21 | Lead resistance of 0.5 Ω per lead is the author's constructed value |
| S23 | TI, **A Basic Guide to Thermocouple Measurements**, SBAA274A, September 2018, revised March 2023; [PDF](https://www.ti.com/lit/pdf/sbaa274) | §1.1 Seebeck voltage and reference junction; Table 1-1 type K range and 39.48 µV/°C at 0 °C; §1.3 cold-junction compensation; §1.4.4 worked 623.5 °C vs 625 °C case; §1.4.6 burn-out full-scale reading. C22, C23 | Worked figures are TI's; chapter paraphrases |
| S24 | TI, **Methods to Reduce Thermistor Linearization Error, Memory, and Power Requirements**, SNOAA12, December 2018; [PDF](https://www.ti.com/lit/pdf/snoaa12) | Abstract and §1.2: NTC highly nonlinear; §2: polyfit, LUT and Steinhart–Hart linearization trade-offs. C20 | Beta-model table values are constructed (β = 3950 K assumed) |
| S25 | TI, **LMT70 datasheet**, SNIS187A, March 2015, revised July 2015; [PDF](https://www.ti.com/lit/ds/symlink/lmt70.pdf) | Features: analog output with −5.19 mV/°C slope. C24 | Device-specific slope used only as an example of a falling output |
| S26 | TI, **HDC2010 datasheet**, SNAS693D, July 2017, revised February 2021; [PDF](https://www.ti.com/lit/ds/symlink/hdc2010.pdf) | §7.3: polymer-dielectric capacitive sensing; contaminant protection; hysteresis and long-term drift specifications; §7.3.3 heater for condensation. C25 | Device figures not generalized |
| S27 | TI, **OPT3001 datasheet**, SBOS681C, July 2014, revised November 2017; [PDF](https://www.ti.com/lit/ds/symlink/opt3001.pdf) | Description: spectral response matched to the human eye with infrared rejection. C25 | Representative device |
| S28 | TI, **DRV5055 datasheet**, SBAS640C, January 2018, revised June 2026; [PDF](https://www.ti.com/lit/ds/symlink/drv5055.pdf) | Hall-effect output proportional to magnetic flux density; magnet temperature-drift compensation. C25 | Representative device |
| S29 | K. Rao et al., **A MEMS Micro-g Capacitive Accelerometer Based on Through-Silicon-Wafer-Etching Process**, *Micromachines* 10(6):380, 2019; [DOI](https://doi.org/10.3390/mi10060380) | Spring-mass transforms acceleration to proof-mass displacement, read as capacitance; stiffness trades range and bandwidth against noise; tilt calibration with gravity components. C25 | Peer-reviewed design paper; principle only |
| S30 | NASA Glenn Research Center, **Speed of Sound**, Beginner's Guide, last updated 13 May 2021; [page](https://www.grc.nasa.gov/WWW/K-12/BGP/sound.html) | Speed of sound = √(γRT) with absolute temperature. C26 | Ideal-gas relation; humidity and other effects excluded |
| S31 | Sensirion, **SGP40 datasheet**, version 1.2, February 2022; [PDF](https://sensirion.com/media/documents/296373BB/6203C5DF/Sensirion_Gas_Sensors_Datasheet_SGP40.pdf) | MOx sensor on temperature-controlled hotplate; raw signal proportional to logarithm of sensing-material resistance; Gas Index Algorithm adapts to the environment; humidity compensation when humidity is supplied. C25 | Representative device |
| S33 | NXP (Freescale), **Detecting Freefall with Low-G Accelerometers**, AN3151 Rev 0, November 2006; [PDF](https://www.nxp.com/docs/en/application-note/AN3151.pdf) | At rest each axis senses a portion of gravity by orientation (1 g parallel, 0 g perpendicular); during freefall all three axes converge to 0 g. C25 | Older device note; principle only |
| S32 | NIST, **ITS-90 Thermocouple Database** (SRD 60); [site](https://srdata.nist.gov/its90/main/) | Reference functions cited by S23; further reading | Not used for chapter numbers directly |

## Evidence classes

- Definitions/methods: source-backed paraphrases, scoped to the cited editions.
- Worked quantities: author-stipulated illustrative values; equations derive their consequences.
- Recommendations/data contract: engineering judgments from the stated requirements, not standard mandates.
- Empirical observations: none. Physical calibration, response qualification, device accuracy and independent review are not claimed.

Refresh on terminology corrections, an identified equation defect, new relevant GUM amendment, scope changes, or selection of actual hardware. Hardware selection would require its exact datasheet, errata and operating configuration; this chapter does not substitute for them.
