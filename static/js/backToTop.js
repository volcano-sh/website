// Back to top button functionality
document.addEventListener('DOMContentLoaded', function() {
  const backToTopButton = document.querySelector('.footer__back-to-top');
  
  if (backToTopButton) {
    backToTopButton.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
});
