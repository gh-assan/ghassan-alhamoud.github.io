/**
 * projects.js — Fetch projects.json and render project cards.
 *
 * Used on:
 * - Homepage: renders featured projects in #featuredProjectList
 * - Projects listing page: renders all projects in #projectsPageList
 */

(function () {
  'use strict';

  var PROJECTS_URL = '/projects/projects.json';

  function createProjectCard(project) {
    var card = document.createElement('a');
    card.className = 'article-card project-card';
    if (project.highlighted) card.classList.add('project-card--featured');
    card.href = '/projects/' + project.slug + '.html';

    var tagsHtml = '';
    if (project.tags && project.tags.length > 0) {
      tagsHtml = '<div class="article-card__tags project-card__tags">' +
        project.tags.map(function (tag) {
          return '<span class="article-card__tag project-card__tag">' + tag + '</span>';
        }).join('') +
        '</div>';
    }

    var contentHtml =
      '<div class="article-card__meta project-card__meta">' +
        '<span class="article-card__date project-card__status">' + project.status + '</span>' +
        '<span class="article-card__dot"></span>' +
        '<span class="article-card__reading-time project-card__stack">' + project.stack.slice(0, 3).join(' / ') + '</span>' +
      '</div>' +
      '<div class="article-card__title project-card__title">' + project.title + '</div>' +
      '<div class="article-card__excerpt project-card__summary">' + project.summary + '</div>' +
      '<div class="article-card__excerpt project-card__outcome"><strong>Outcome:</strong> ' + project.outcome + '</div>' +
      tagsHtml +
      '<span class="project-card__action">' +
        (project.slug === 'scalability-lab' ? 'Explore the live workshop' : 'Inspect the system') +
        ' &rarr;</span>';

    if (project.image) {
      card.innerHTML =
        '<div class="project-card__visual"><img class="project-card__image" src="' + project.image + '" alt="" width="1200" height="630" loading="lazy"></div>' +
        '<div class="project-card__content">' + contentHtml + '</div>';
    } else if (project.highlighted) {
      // Featured cards use a two-column grid on wide screens; without an
      // image the content column must span both tracks.
      card.innerHTML =
        '<div class="project-card__content project-card__content--full">' + contentHtml + '</div>';
    } else {
      card.innerHTML = contentHtml;
    }

    return card;
  }

  function renderProjects(projects) {
    var projectsPageList = document.getElementById('projectsPageList');
    if (projectsPageList) {
      projectsPageList.innerHTML = '';
      projects.forEach(function (project) {
        projectsPageList.appendChild(createProjectCard(project));
      });
      projectsPageList.classList.add('reveal--visible');
    }
  }

  function showError() {
    // Non-destructive failure: keep statically rendered cards in place
    // and only show an error where a container has nothing to show.
    [
      document.getElementById('projectsPageList')
    ].forEach(function (el) {
      if (el && el.querySelectorAll('a').length === 0) {
        el.innerHTML = '<p class="articles-preview__loading">Could not load projects.</p>';
      }
    });
  }

  function init() {
    fetch(PROJECTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
      })
      .then(renderProjects)
      .catch(function (err) {
        console.error('Projects.js: Could not load projects', err);
        showError();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
