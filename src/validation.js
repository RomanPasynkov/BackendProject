function normalizeContact(input) {
  return {
    name: String(input.name || '').trim(),
    phone: String(input.phone || '').trim(),
    email: String(input.email || '').trim(),
    message: String(input.message || '').trim(),
  };
}

function validateContact(values) {
  const errors = {};

  if (!values.name) {
    errors.name = 'Поле обязательно';
  } else if ([...values.name].length < 2) {
    errors.name = 'Минимум 2 символа';
  } else if ([...values.name].length > 150) {
    errors.name = 'Не более 150 символов';
  }

  if (!values.phone) {
    errors.phone = 'Поле обязательно';
  } else if (!/^\+?[0-9\s\-()]{6,20}$/.test(values.phone)) {
    errors.phone = 'Некорректный формат телефона';
  }

  if (!values.email) {
    errors.email = 'Поле обязательно';
  } else if (!/^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i.test(values.email)) {
    errors.email = 'Некорректный email';
  } else if ([...values.email].length > 255) {
    errors.email = 'Не более 255 символов';
  }

  if (!values.message) {
    errors.message = 'Поле обязательно';
  } else if ([...values.message].length < 10) {
    errors.message = 'Минимум 10 символов';
  } else if ([...values.message].length > 2000) {
    errors.message = 'Не более 2000 символов';
  }

  return errors;
}

module.exports = { normalizeContact, validateContact };
