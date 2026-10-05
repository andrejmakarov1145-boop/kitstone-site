const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
menuToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open'); menuToggle?.setAttribute('aria-expanded', 'false');
}));
document.querySelector('#year').textContent = new Date().getFullYear();

document.querySelectorAll('[data-product]').forEach(link => link.addEventListener('click', () => {
  const select = document.querySelector('select[name="product"]');
  const value = link.dataset.product;
  if ([...select.options].some(o => o.value === value || o.textContent === value)) select.value = value;
}));

const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
}, { threshold: 0.12 }) : null;
document.querySelectorAll('.product-card,.process-step,.approach-item,.section-heading').forEach(el => {
  el.classList.add('reveal');
  if (observer) observer.observe(el); else el.classList.add('visible');
});

const form = document.querySelector('#leadForm');
const status = document.querySelector('#formStatus');
form?.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = '';
  status.classList.remove('error');
  const button = form.querySelector('button[type="submit"]');
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = 'Отправляем…';
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Не удалось отправить заявку.');
    status.textContent = 'Спасибо! Заявка сохранена. Это демонстрационная версия — перед публикацией подключите реальные контакты отдела продаж.';
    form.reset();
  } catch (error) {
    status.textContent = 'Не удалось сохранить заявку. Проверьте, что сервер запущен, и попробуйте ещё раз.';
    status.classList.add('error');
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
});
