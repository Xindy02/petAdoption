document.addEventListener("DOMContentLoaded", function () {
    // Fetch the user profile data from the server
    fetch('/userprofile')
        .then(response => response.json())
        .then(data => {
            const loginButton = document.getElementById('loginButton');
            const signupButton = document.getElementById('signupButton');
            const profileContainer = document.getElementById('profile-container');

            if (data.loggedIn) {
                // Hide login and signup buttons
                if (loginButton) loginButton.style.display = 'none';
                if (signupButton) signupButton.style.display = 'none';

                // Display the profile container
                profileContainer.style.display = 'flex';

                // Check if the user has a profile picture
                if (data.profilePic) {
                    const profileImage = document.createElement('img');
                    profileImage.src = data.profilePic;
                    profileImage.alt = 'User Avatar';
                    profileImage.className = 'avatar';
                    profileImage.style.width = '40px';
                    profileImage.style.height = '40px';

                    // Clear any previous content and append the profile image
                    profileContainer.innerHTML = '';
                    profileContainer.appendChild(profileImage);
                } else {
                    // Display initials if the profile picture is not available
                    const initialsContainer = document.createElement('div');
                    initialsContainer.className = 'd-flex justify-content-center align-items-center bg-primary text-white rounded-circle avatar';
                    initialsContainer.style.width = '40px';
                    initialsContainer.style.height = '40px';
                    initialsContainer.style.fontSize = '16px';
                    initialsContainer.style.fontWeight = 'bold';

                    // Check that the firstName and lastName exist before accessing them
                    const firstInitial = data.firstName ? data.firstName.charAt(0).toUpperCase() : '';
                    const lastInitial = data.lastName ? data.lastName.charAt(0).toUpperCase() : '';
                    initialsContainer.textContent = firstInitial + lastInitial;

                    // Clear any previous content and append the initials
                    profileContainer.innerHTML = '';
                    profileContainer.appendChild(initialsContainer);
                }
            } else {
                // If the user is not logged in, hide the profile container
                if (profileContainer) profileContainer.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching profile data:', error);
        });
});
