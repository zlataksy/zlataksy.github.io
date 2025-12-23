document.addEventListener('DOMContentLoaded', () => {
    const videos = document.querySelectorAll('.video-item video');
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    const closeModal = document.querySelector('.close-modal');
    const soundToggles = document.querySelectorAll('.sound-toggle');

    // Autoplay logic: Intersection Observer to play/pause videos when they enter/leave viewport
    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.play().catch(error => {
                    console.log("Autoplay blocked or failed:", error);
                });
            } else {
                entry.target.pause();
            }
        });
    }, observerOptions);

    videos.forEach(video => {
        observer.observe(video);
        
        // Open modal on click
        video.parentElement.addEventListener('click', (e) => {
            // Don't open modal if clicking the sound toggle
            if (e.target.closest('.sound-toggle')) return;

            modal.style.display = 'flex';
            modalVideo.src = video.querySelector('source').src;
            modalVideo.play();
        });
    });

    // Sound toggle logic
    soundToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const video = toggle.parentElement.querySelector('video');
            video.muted = !video.muted;
            
            const icon = toggle.querySelector('i');
            if (video.muted) {
                icon.classList.replace('fa-volume-up', 'fa-volume-mute');
            } else {
                icon.classList.replace('fa-volume-mute', 'fa-volume-up');
                // Ensure other videos are muted if this one is unmuted (optional, but better UX)
                videos.forEach(v => {
                    if (v !== video) {
                        v.muted = true;
                        const otherToggle = v.parentElement.querySelector('.sound-toggle i');
                        otherToggle.classList.replace('fa-volume-up', 'fa-volume-mute');
                    }
                });
            }
        });
    });

    // Close modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        modalVideo.pause();
        modalVideo.src = "";
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            modalVideo.pause();
            modalVideo.src = "";
        }
    });
});
