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
    card.className = 'project-card';
    card.href = '/projects/' + project.slug + '.html';

    var tagsHtml = '';
    if (project.tags && project.tags.length > 0) {
      tagsHtml = '<div class="project-card__tags">' +
        project.tags.map(function (tag) {
          return '<span class="project-card__tag">' + tag + '</span>';
        }).join('') +
        '</div>';
    }

    card.innerHTML =
      '<div class="project-card__meta">' +
        '<span class="project-card__status">' + project.status + '</span>' +
        '<span class="article-card__dot"></span>' +
        '<span class="project-card__stack">' + project.stack.slice(0, 3).join(' / ') + '</span>' +
      '</div>' +
      '<h3 class="project-card__title">' + project.title + '</h3>' +
      '<p class="project-card__summary">' + project.summary + '</p>' +
      '<div class="project-card__outcome"><strong>Outcome:</strong> ' + project.outcome + '</div>' +
      tagsHtml;

    return card;
  }

  function renderProjects(projects) {
    var featuredList = document.getElementById('featuredProjectList');
    if (featuredList) {
      featuredList.innerHTML = '';
      projects.filter(function (project) {
        return project.featured;
      }).forEach(function (project) {
        featuredList.appendChild(createProjectCard(project));
      });
      featuredList.classList.add('reveal--visible');
    }

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
    [
      document.getElementById('featuredProjectList'),
      document.getElementById('projectsPageList')
    ].forEach(function (el) {
      if (el) {
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
