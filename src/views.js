// Fallback HTML renderer — used ONLY when JS is disabled and the browser
// does a native form POST.  With JS enabled the static public/form.html
// handles everything client-side via fetch.

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderFormPage({ config, errors = {}, values, message = '', credentials = null, isAuthenticated = false, authError = '', authForm = {} }) {
  const basePath = config ? config.basePath || '' : '';
  const v = values || {};
  const esc = escapeHtml;

  const err = (field) => errors[field]
    ? `<span class="field__error">${esc(errors[field])}</span>`
    : '<span class="field__error"></span>';

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Оставить заявку — Drupal Coder</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${basePath}/css/styles.css" />
  <link rel="stylesheet" href="${basePath}/css/form.css" />
</head>
<body>
  <div class="formPage__nav">
    <div class="container nav">
      <a class="brand" href="${basePath}/" aria-label="На главную">
        <span class="brand__mark">DC</span>
        <span class="brand__text">Drupal Coder</span>
      </a>
      <nav class="menu menu--desktop menu--always" aria-label="Навигация">
        <ul class="menu__list">
          <li class="menu__item"><a class="menu__link" href="${basePath}/">Главная</a></li>
          <li class="menu__item"><a class="menu__link menu__link--active" href="${basePath}/form">Анкета</a></li>
        </ul>
      </nav>
    </div>
  </div>

  <main id="main">
    <section class="section" id="form-section">
      <div class="container">
        <div class="section__head">
          <h2 class="section__title">Оставить заявку</h2>
          <p class="section__desc">Заполните форму — после первой отправки вы получите логин и пароль для редактирования данных.</p>
        </div>

        ${message ? `<div class="formAlert formAlert--ok">${esc(message)}</div>` : ''}
        ${credentials ? `<div class="formAlert formAlert--ok"><strong>Сохраните данные для входа:</strong><br>Логин: <code>${esc(credentials.login)}</code><br>Пароль: <code>${esc(credentials.password)}</code></div>` : ''}

        <div class="contact">
          <form class="form" id="contactForm" action="${basePath}/api/contacts" method="post" novalidate>
            ${isAuthenticated ? '<input type="hidden" name="_method" value="PUT">' : ''}
            <div class="form__row form__row--3">
              <label class="field">
                <span class="field__label">Имя</span>
                <input class="field__input" type="text" name="name" autocomplete="name" required minlength="2" value="${esc(v.name || '')}" />
                ${err('name')}
              </label>

              <label class="field">
                <span class="field__label">Телефон</span>
                <input class="field__input" type="tel" name="phone" autocomplete="tel" required minlength="6" value="${esc(v.phone || '')}" />
                ${err('phone')}
              </label>

              <label class="field">
                <span class="field__label">Email</span>
                <input class="field__input" type="email" name="email" autocomplete="email" required value="${esc(v.email || '')}" />
                ${err('email')}
              </label>
            </div>

            <label class="field">
              <span class="field__label">Сообщение</span>
              <textarea class="field__input field__input--area" name="message" rows="5" required minlength="10">${esc(v.message || '')}</textarea>
              ${err('message')}
            </label>

            <div class="form__foot">
              <button class="btn btn--primary" type="submit" id="submitBtn">
                <span class="btn__text">${isAuthenticated ? 'Обновить данные' : 'Отправить'}</span>
                <span class="btn__spinner" aria-hidden="true"></span>
              </button>
              ${isAuthenticated
                ? `<form action="${basePath}/api/logout" method="post" style="display:inline"><button class="btn btn--ghost" type="submit">Выйти</button></form>`
                : '<p class="form__note">Нажимая «Отправить», вы соглашаетесь на обработку данных.</p>'}
            </div>

            <p class="form__status" id="formStatus" role="status" aria-live="polite"></p>
          </form>

          <aside class="contact__info">
            ${!isAuthenticated ? `
            <div class="infoCard" id="authCard">
              <h3 class="infoCard__title">Уже есть аккаунт?</h3>
              <p class="infoCard__text">Войдите, чтобы загрузить и изменить ранее отправленные данные.</p>
              ${authError ? `<p class="formAlert formAlert--err" style="margin-bottom:10px">${esc(authError)}</p>` : ''}
              <form class="form form--compact" id="authForm" action="${basePath}/api/login" method="post">
                <label class="field">
                  <span class="field__label">Логин</span>
                  <input class="field__input" type="text" name="login" autocomplete="username" value="${esc(authForm.login || '')}" />
                </label>
                <label class="field">
                  <span class="field__label">Пароль</span>
                  <input class="field__input" type="password" name="password" autocomplete="current-password" />
                </label>
                <button class="btn btn--ghost" type="submit" style="width:100%;margin-top:8px">Войти</button>
              </form>
            </div>` : `
            <div class="infoCard">
              <h3 class="infoCard__title">Режим редактирования</h3>
              <p class="infoCard__text">Вы вошли в систему. Измените данные формы и нажмите «Обновить данные».</p>
            </div>`}
          </aside>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container footer__inner">
      <p class="muted">© ${new Date().getFullYear()} Drupal Coder</p>
      <a class="muted" href="${basePath}/">На главную</a>
    </div>
  </footer>

  <script src="${basePath}/js/app.js"></script>
</body>
</html>`;
}

module.exports = { renderFormPage };
