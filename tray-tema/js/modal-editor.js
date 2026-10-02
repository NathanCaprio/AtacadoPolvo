window.addEventListener('load', function () {
  const closeModal = () => {
    document.querySelectorAll('[data-close-modal="editor"]').forEach((element) => {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.modal-editor').classList.remove('show');
      });
    });
  };

  const openModal = () => {
    document.querySelectorAll('[data-open-modal="editor"]').forEach((element) => {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.modal-editor').classList.add('show');
      });
    });
  };

  openModal();
  closeModal();
});
