/* =====================================================
   HEART / 01
   INTERACTION ENGINE
   BURGUNDY EDITION
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;


    // ==============================================
    // SCROLL REVEAL ANIMATION
    // ==============================================

    const revealElements =
        document.querySelectorAll(".reveal");


    if ("IntersectionObserver" in window) {

        const revealObserver = new IntersectionObserver(

            function (entries, observer) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("visible");

                        observer.unobserve(entry.target);

                    }

                });

            },

            {
                threshold: 0.12,
                rootMargin: "0px 0px -30px 0px"
            }

        );


        revealElements.forEach(function (element, index) {

            element.style.transitionDelay =
                `${Math.min(index * 0.06, 0.36)}s`;

            revealObserver.observe(element);

        });

    } else {

        revealElements.forEach(function (element) {

            element.classList.add("visible");

        });

    }



    // ==============================================
    // MOBILE NAVIGATION
    // ==============================================

    const menuButton =
        document.getElementById("mobileMenu");

    const navigation =
        document.getElementById("navigation");


    if (menuButton && navigation) {

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );


        menuButton.addEventListener("click", function () {

            const isOpen =
                navigation.classList.toggle("open");

            menuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

        });


        navigation.querySelectorAll("a").forEach(function (link) {

            link.addEventListener("click", function () {

                navigation.classList.remove("open");

                menuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

            });

        });


        // Close menu when clicking outside

        document.addEventListener("click", function (event) {

            if (
                navigation.classList.contains("open") &&
                !navigation.contains(event.target) &&
                !menuButton.contains(event.target)
            ) {

                navigation.classList.remove("open");

                menuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        });

    }



    // ==============================================
    // ACTIVE NAVIGATION LINK
    // ==============================================

    const sections =
        document.querySelectorAll("main section[id]");

    const navLinks =
        document.querySelectorAll(".nav-link");


    if ("IntersectionObserver" in window && sections.length) {

        const sectionObserver = new IntersectionObserver(

            function (entries) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        navLinks.forEach(function (link) {

                            const isActive =
                                link.getAttribute("href") ===
                                `#${entry.target.id}`;

                            link.classList.toggle(
                                "active",
                                isActive
                            );

                        });

                    }

                });

            },

            {
                threshold: 0.35
            }

        );


        sections.forEach(function (section) {

            sectionObserver.observe(section);

        });

    }



    // ==============================================
    // SMOOTH SCROLL
    // ==============================================

    document.querySelectorAll('a[href^="#"]').forEach(

        function (link) {

            link.addEventListener("click", function (event) {

                const selector =
                    this.getAttribute("href");

                if (!selector || selector === "#") {
                    return;
                }

                const target =
                    document.querySelector(selector);

                if (!target) {
                    return;
                }

                event.preventDefault();

                target.scrollIntoView({

                    behavior: reducedMotion ? "auto" : "smooth",

                    block: "start"

                });

            });

        }

    );



    // ==============================================
    // ANATOMICAL HEART INTERACTION
    // ==============================================

    const heroVisual =
        document.querySelector(".hero-visual");

    const heart =
        document.querySelector(".anatomical-heart");


    if (
        heroVisual &&
        heart &&
        !reducedMotion &&
        window.matchMedia("(pointer: fine)").matches
    ) {

        heroVisual.addEventListener("pointermove", function (event) {

            const rect =
                heroVisual.getBoundingClientRect();

            const x =
                (event.clientX - rect.left) / rect.width - 0.5;

            const y =
                (event.clientY - rect.top) / rect.height - 0.5;


            heart.style.setProperty(
                "--heart-x",
                `${x * 8}px`
            );

            heart.style.setProperty(
                "--heart-y",
                `${y * 8}px`
            );

        });


        heroVisual.addEventListener("pointerleave", function () {

            heart.style.setProperty("--heart-x", "0px");

            heart.style.setProperty("--heart-y", "0px");

        });

    }



    // ==============================================
    // FEATURE CARD INTERACTION
    // ==============================================

    const cards =
        document.querySelectorAll(".feature-card");


    cards.forEach(function (card) {

        card.addEventListener("mouseenter", function () {

            card.style.zIndex = "2";

        });


        card.addEventListener("mouseleave", function () {

            card.style.zIndex = "1";

        });

    });


});