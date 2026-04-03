const googleButton = document.getElementById('btnGoogleLogin');

if (googleButton) {
  googleButton.addEventListener('click', () => {
    window.location.href = '/google-login.php';
  });
}