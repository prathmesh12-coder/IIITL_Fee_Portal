// show scroll top
function scrollTop() {
  const scrollTop = document.getElementById('scroll-top');
  // When the scroll is higher than 560 viewport height, add the show-scroll class to the a tag with the scroll-top class
  if (this.scrollY >= 400) {
    scrollTop.classList.add('show-scroll');
  }
  else {
    scrollTop.classList.remove('show-scroll');
  }
}
window.addEventListener('scroll', scrollTop);



// ------->>> sticky navbar
// When the user scrolls the page, execute myFunction
window.onscroll = function () { myFunction() };

// Get the navbar
var navbar = document.getElementById("secnavbar");
var sticky = navbar.offsetTop;

// Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
function myFunction() {
  if (window.pageYOffset >= sticky) {
    navbar.classList.add("sticky")
  } else {
    navbar.classList.remove("sticky");
  }
}


// ------------->>>  image slider
let slideIndex = 0;
// showSlides();

function showSlides() {
  let i;
  let slides = document.getElementsByClassName("mySlides");
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  slideIndex++;
  if (slideIndex > slides.length) { slideIndex = 1 }
  slides[slideIndex - 1].style.display = "block";
  setTimeout(showSlides, 4000); // Change image every 2 seconds
}


// ----------------- >>>>  typing home section  <<<< -----------
function hometyping() {
  var typed = new Typed(".typing", {
    strings: ["Hello, Welcome..."],
    typeSpeed: 100,
    backSpeed: 60,
    loop: true
  });
}
hometyping();