document.addEventListener("DOMContentLoaded", function() {
    const menuBtn = document.querySelector(".menu-btn");
    const sidebar = document.querySelector("#sidebar");
    const closeMenu = document.querySelector("#close-menu");
    let isStreaming = false;

    menuBtn.addEventListener("click", function() {
        sidebar.classList.toggle("active");
    });

    closeMenu.addEventListener("click", function() {
        sidebar.classList.remove("active");
    });

    function stopStreaming() {
        if (isStreaming) {
            fetch('http://223.171.143.119:8000/toggle-stream', { method: 'GET', keepalive: true })
                .then(() => isStreaming = false);
        }
    }

    window.addEventListener("beforeunload", stopStreaming);
    sidebar.querySelectorAll("a").forEach(link => link.addEventListener("click", stopStreaming));
});
