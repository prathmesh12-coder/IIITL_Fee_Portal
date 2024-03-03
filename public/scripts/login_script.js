let textInputs = document.querySelectorAll("input");

textInputs.forEach(textInputs => {
    textInputs.addEventListener("focus", () => {
        let parent = textInputs.parentNode;
        parent.classList.add("active");
    });

    textInputs.addEventListener("blur", () => {
        let parent = textInputs.parentNode;
        parent.classList.remove("active");
    });
});

// password show hide button
let passwordInput = document.querySelector(".password-input");
let eyeBtn = document.querySelector(".eye-btn");

eyeBtn.onclick = function()
{  
    if(passwordInput.type === "password")
    {
        passwordInput.type = "text";
        eyeBtn.innerHTML = "<ion-icon name = 'eye-outline' class = 'icon'></ion-icon>";
    }
    else
    {
        passwordInput.type = "password";
        eyeBtn.innerHTML = "<ion-icon name = 'eye-off-outline' class = 'icon'></ion-icon>";
    }
}

// sliding between sign-in form and sign-up form
let signUpBtn = document.querySelector(".sign-up-btn");
let signInBtn = document.querySelector(".sign-in-btn");
let signUpForm = document.querySelector(".sign-up-form");
let signInForm = document.querySelector(".sign-in-form");

signUpBtn.onclick = function()
{
    signInForm.classList.add("hide");
    signUpForm.classList.add("show");
    signInForm.classList.remove("show");
}

signInBtn.onclick = function()
{
    signUpForm.classList.remove("show");
    signInForm.classList.remove("hide");
    signInForm.classList.add("show");
}


// function onSignIn(googleUser) {
//     var profile = googleUser.getBasicProfile();
//     console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
//     console.log('Name: ' + profile.getName());
//     console.log('Image URL: ' + profile.getImageUrl());
//     console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
//   }
