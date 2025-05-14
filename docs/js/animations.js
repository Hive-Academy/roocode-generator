// Animations for RooCode Orchestrator Presentation

document.addEventListener("DOMContentLoaded", () => {
  // Initialize GSAP ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.defaults({ scroller: ".scroll-container" }); // Set default scroller

  // Animation for appear effect on scroll
  const appearElements = document.querySelectorAll(".appear-animation");
  appearElements.forEach((element, index) => {
    gsap.from(element, {
      scrollTrigger: {
        trigger: element,
        start: "top 80%",
        toggleClass: { targets: element, className: "active" },
        once: true,
        markers: false, // Added for debugging
      },
      opacity: 0,
      y: 20,
      duration: 0.6,
      delay: element.style.transitionDelay
        ? parseFloat(element.style.transitionDelay)
        : 0,
    });
  });

  // Role card hover effect enhancements
  const roleCards = document.querySelectorAll(".role-card");
  roleCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      gsap.to(card, {
        scale: 1.05,
        duration: 0.3,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
      });
    });

    card.addEventListener("mouseleave", () => {
      gsap.to(card, {
        scale: 1,
        duration: 0.3,
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
      });
    });
  });

  // Animated workflow demonstration
  const workflowDemo = document.getElementById("workflow-demo");
  if (workflowDemo) {
    const steps = workflowDemo.querySelectorAll(".workflow-step");
    let currentStep = 0;

    const highlightNext = () => {
      // Remove highlight from all steps
      steps.forEach((step) => step.classList.remove("highlight-pulse"));

      // Add highlight to current step
      if (currentStep < steps.length) {
        steps[currentStep].classList.add("highlight-pulse");
        currentStep = (currentStep + 1) % steps.length;
      }
    };

    // Initial highlight
    highlightNext();

    // Set interval for automatic stepping
    setInterval(highlightNext, 3000);
  }

  // Interactive role connection visualization
  const roleConnections = document.querySelectorAll(".role-connection");
  roleConnections.forEach((conn) => {
    conn.addEventListener("mouseenter", () => {
      const roleId = conn.getAttribute("data-connects");
      if (roleId) {
        const connectedRole = document.getElementById(roleId);
        if (connectedRole) {
          gsap.to(connectedRole, {
            backgroundColor: "rgba(74, 222, 128, 0.2)",
            duration: 0.3,
          });
        }
      }
    });

    conn.addEventListener("mouseleave", () => {
      const roleId = conn.getAttribute("data-connects");
      if (roleId) {
        const connectedRole = document.getElementById(roleId);
        if (connectedRole) {
          gsap.to(connectedRole, {
            backgroundColor: "transparent",
            duration: 0.3,
          });
        }
      }
    });
  });

  // Animated token comparison
  const animateTokenComparison = () => {
    const traditionalBars = document.querySelectorAll(".traditional-bar");
    const roocodeBars = document.querySelectorAll(".roocode-bar");

    // Animate traditional approach (growing bars)
    traditionalBars.forEach((bar, index) => {
      const height = parseInt(bar.getAttribute("data-height") || 100);
      gsap.from(bar, {
        height: 0,
        duration: 1,
        delay: index * 0.2,
        ease: "power2.out",
      });
    });

    // Animate RooCode approach (stable bars)
    roocodeBars.forEach((bar, index) => {
      const height = parseInt(bar.getAttribute("data-height") || 100);
      gsap.from(bar, {
        height: 0,
        duration: 1,
        delay: index * 0.2 + 1, // Start after traditional bars
        ease: "power2.out",
      });
    });
  };

  // Trigger token comparison animation when the section comes into view
  const tokenSection = document.getElementById("token-comparison");
  if (tokenSection) {
    ScrollTrigger.create({
      trigger: tokenSection,
      start: "top 70%",
      onEnter: animateTokenComparison,
      once: true,
    });
  }
});
