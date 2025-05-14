// Navigation and UI interaction for RooCode Orchestrator Presentation

document.addEventListener("DOMContentLoaded", () => {
  // Add navigation buttons
  const addNavButtons = () => {
    const slides = document.querySelectorAll(".slide");

    slides.forEach((slide, index) => {
      // Don't add "previous" button to first slide
      if (index > 0) {
        const prevButton = document.createElement("button");
        prevButton.className =
          "nav-button prev-button fixed left-4 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-md text-indigo-600 hover:bg-indigo-100 transition-all";
        prevButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                `;
        prevButton.addEventListener("click", () => {
          const prevSlide = slides[index - 1];
          prevSlide.scrollIntoView({ behavior: "smooth" });
        });
        slide.appendChild(prevButton);
      }

      // Don't add "next" button to last slide
      if (index < slides.length - 1) {
        const nextButton = document.createElement("button");
        nextButton.className =
          "nav-button next-button fixed right-4 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-md text-indigo-600 hover:bg-indigo-100 transition-all";
        nextButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                `;
        nextButton.addEventListener("click", () => {
          const nextSlide = slides[index + 1];
          nextSlide.scrollIntoView({ behavior: "smooth" });
        });
        slide.appendChild(nextButton);
      }
    });
  };

  // Add slide indicators
  const addSlideIndicators = () => {
    const slides = document.querySelectorAll(".slide");
    const scrollContainer = document.querySelector(".scroll-container");
    const indicatorsContainer = document.createElement("div");
    indicatorsContainer.className =
      "slide-indicators fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2 z-50";

    slides.forEach((slide, index) => {
      const indicator = document.createElement("div");
      indicator.className =
        "w-3 h-3 rounded-full bg-gray-300 cursor-pointer transition-all hover:bg-indigo-400";
      indicator.setAttribute("data-slide", index);

      indicator.addEventListener("click", () => {
        // This might need adjustment if .scroll-container is the sole scroller
        // For now, let GSAP handle animations; direct scroll might conflict
        if (scrollContainer) {
          scrollContainer.scrollTop =
            slide.offsetTop - scrollContainer.offsetTop;
        } else {
          slides[index].scrollIntoView({ behavior: "smooth" });
        }
      });

      indicatorsContainer.appendChild(indicator);
    });

    document.body.appendChild(indicatorsContainer);

    // Update active indicator on scroll
    const updateActiveIndicator = () => {
      if (!scrollContainer) return;

      const scrollPosition = scrollContainer.scrollTop;
      const scrollerHeight = scrollContainer.clientHeight;

      slides.forEach((slide, index) => {
        // slide.offsetTop is relative to its offsetParent.
        // If slides are direct children of scroll-container, or their offsetParent is the body
        // and scroll-container is at top 0 of body, this might be fine.
        // Otherwise, slideTop might need to be relative to scrollContainer.
        // For now, assuming slide.offsetTop is usable directly or needs minor adjustment.
        // A robust way: slide.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop;
        const slideTopInScroller = slide.offsetTop - scrollContainer.offsetTop; // Simplified assumption
        const slideHeight = slide.offsetHeight;

        if (
          scrollPosition >= slideTopInScroller - scrollerHeight / 2 &&
          scrollPosition < slideTopInScroller + slideHeight - scrollerHeight / 2
        ) {
          // Set active indicator
          document
            .querySelectorAll(".slide-indicators div")
            .forEach((ind, i) => {
              if (i === index) {
                ind.classList.add("bg-indigo-600");
                ind.classList.add("w-4");
                ind.classList.add("h-4");
              } else {
                ind.classList.remove("bg-indigo-600");
                ind.classList.remove("w-4");
                ind.classList.remove("h-4");
              }
            });
        }
      });
    };

    // Initial update
    updateActiveIndicator();

    // Update on scroll
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", updateActiveIndicator);
    }
  };

  // Add navigation menu
  const addNavigationMenu = () => {
    const slides = document.querySelectorAll(".slide");
    const menuButton = document.createElement("button");
    menuButton.className =
      "menu-button fixed top-4 right-4 bg-white p-2 rounded-full shadow-md text-indigo-600 hover:bg-indigo-100 transition-all z-50";
    menuButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        `;

    const menu = document.createElement("div");
    menu.className =
      "navigation-menu fixed top-16 right-4 bg-white rounded-lg shadow-lg p-4 z-50 transform scale-0 origin-top-right transition-transform duration-200 ease-in-out";
    menu.style.width = "250px";

    // Add menu items based on slide IDs and h2 content
    let menuContent = '<ul class="space-y-2">';
    slides.forEach((slide, index) => {
      const slideId = slide.id;
      const slideTitle = slide.querySelector("h2")
        ? slide.querySelector("h2").textContent
        : `Slide ${index + 1}`;

      menuContent += `
                <li>
                    <a href="#${slideId}" class="block px-4 py-2 text-gray-700 hover:bg-indigo-100 rounded-md transition-colors" data-slide="${index}">
                        ${slideTitle}
                    </a>
                </li>
            `;
    });
    menuContent += "</ul>";

    menu.innerHTML = menuContent;

    // Toggle menu on button click
    menuButton.addEventListener("click", () => {
      if (menu.style.transform === "scale(1)") {
        menu.style.transform = "scale(0)";
      } else {
        menu.style.transform = "scale(1)";
      }
    });

    // Navigate to slide when menu item is clicked
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const slideIndex = parseInt(link.getAttribute("data-slide"));
        if (scrollContainer) {
          scrollContainer.scrollTop =
            slides[slideIndex].offsetTop - scrollContainer.offsetTop;
        } else {
          slides[slideIndex].scrollIntoView({ behavior: "smooth" });
        }
        menu.style.transform = "scale(0)"; // Hide menu after click
      });
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== menuButton) {
        menu.style.transform = "scale(0)";
      }
    });

    document.body.appendChild(menuButton);
    document.body.appendChild(menu);
  };

  // Execute navigation setup
  addNavButtons();
  addSlideIndicators();
  addNavigationMenu();

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    const slides = document.querySelectorAll(".slide");
    const currentSlideIndex = Array.from(slides).findIndex((slide) => {
      const rect = slide.getBoundingClientRect();
      return rect.top <= 100 && rect.bottom > 100;
    });

    if (e.key === "ArrowDown" || e.key === "PageDown") {
      if (currentSlideIndex < slides.length - 1) {
        if (scrollContainer) {
          scrollContainer.scrollTop =
            slides[currentSlideIndex + 1].offsetTop - scrollContainer.offsetTop;
        } else {
          slides[currentSlideIndex + 1].scrollIntoView({ behavior: "smooth" });
        }
      }
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      if (currentSlideIndex > 0) {
        if (scrollContainer) {
          scrollContainer.scrollTop =
            slides[currentSlideIndex - 1].offsetTop - scrollContainer.offsetTop;
        } else {
          slides[currentSlideIndex - 1].scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  });
});
