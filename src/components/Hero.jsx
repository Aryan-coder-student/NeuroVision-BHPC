<<<<<<< HEAD
import React, { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { useNavigate } from "react-router-dom";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

// Enhanced animation styles with responsive considerations
const animationCSS = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeUp {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .hero {
    animation: fadeIn 1.2s ease-out forwards;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    padding: 0 1rem;
    box-sizing: border-box;
  }

  .hero-title {
    animation: fadeUp 1s ease-out 0.3s forwards;
    opacity: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }

  .hero-subtitle {
    animation: fadeUp 1s ease-out 0.5s forwards;
    opacity: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }

  .hero-cta {
    animation: fadeUp 1s ease-out 0.7s forwards;
    opacity: 0;
  }

  .hero-gradient {
    animation: scaleIn 1.5s ease-out forwards;
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: -1;
  }

  /* Button hover effect with responsive considerations */
  .primary-btn {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .primary-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }

  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }

  /* Responsive text sizing */
  @media (max-width: 768px) {
    .hero-title {
      font-size: 1.75rem !important;
    }
    
    .hero-subtitle {
      font-size: 1rem !important;
    }
    
    .primary-btn {
      padding: 0.5rem 1rem !important;
      font-size: 0.9rem !important;
    }
  }

  @media (max-width: 480px) {
    .hero-title {
      font-size: 1.5rem !important;
    }
    
    .hero-subtitle {
      font-size: 0.9rem !important;
    }
    
    .primary-btn {
      padding: 0.4rem 0.8rem !important;
      font-size: 0.8rem !important;
    }
  }
`;

const Hero = () => {
  const navigate = useNavigate();
  const slides = [
    {
      id: 1,
      title: "NeuroVision",
      description: "Welcome to NeuroVision, your AI-powered brain tumor segmentation tool.",
      button: { text: "Learn More", link: "/about", className: "primary-btn" }
    },
    {
      id: 2,
      title: "About Our Model",
      description: "Discover how our advanced AI model works for brain tumor segmentation.",
      button: { text: "Read More", link: "/about", className: "primary-btn" }
    },
    {
      id: 3,
      title: "Chat with Our NeuroVision Bot",
      description: "Get instant answers and assistance from our AI bot.",
      button: { text: "Start Chat", link: "/chat", className: "primary-btn" }
    },
    {
      id: 4,
      title: "Research on Brain Tumor Segmentation",
      description: "Explore cutting-edge research on brain tumor segmentation using AI-powered models like UNet3D and Swin UNETR.",
      button: {
        text: "Explore Research",
        link: "//pubmed.ncbi.nlm.nih.gov/36512875/", // Use protocol-relative URL to avoid being prefixed by localhost
        className: "primary-btn"
      }
    }


  ];

  useEffect(() => {
    // Add animation styles
    const styleElement = document.createElement('style');
    styleElement.innerHTML = animationCSS;
    document.head.appendChild(styleElement);

    // Enable smooth scrolling
    const smoothScrollHandler = (e) => {
      const href = e.currentTarget.getAttribute('href');

      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop,
            behavior: 'smooth'
          });
        }
      }
    };

    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', smoothScrollHandler);
    });

    return () => {
      // Clean up
      document.head.removeChild(styleElement);
      links.forEach(link => {
        link.removeEventListener('click', smoothScrollHandler);
      });
    };
  }, []);

  const handleNavigate = (link) => {
    if (link.startsWith('#')) {
      const targetId = link.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop,
          behavior: 'smooth'
        });
      }
    } else {
      navigate(link);
    }
  };

  return (
    <section className="hero w-full max-w-full">
      <div className="hero-gradient bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
      <div className="container mx-auto px-4">
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectFade]}
          spaceBetween={20}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false
          }}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1000}
          className="rounded-xl shadow-lg overflow-hidden"
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.id} className="hero-content text-center p-6">
              <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold hero-title">{slide.title}</h1>
                <p className="hero-subtitle mt-4 mx-auto max-w-2xl">{slide.description}</p>
                <div className="hero-cta mt-6">
                  <button
                    className={`${slide.button.className} px-6 py-3 rounded-lg`}
                    onClick={() => handleNavigate(slide.button.link)}
                  >
                    {slide.button.text}
                  </button>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

=======
import React, { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { useNavigate } from "react-router-dom";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

// Enhanced animation styles with responsive considerations
const animationCSS = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeUp {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .hero {
    animation: fadeIn 1.2s ease-out forwards;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    padding: 0 1rem;
    box-sizing: border-box;
  }

  .hero-title {
    animation: fadeUp 1s ease-out 0.3s forwards;
    opacity: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }

  .hero-subtitle {
    animation: fadeUp 1s ease-out 0.5s forwards;
    opacity: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }

  .hero-cta {
    animation: fadeUp 1s ease-out 0.7s forwards;
    opacity: 0;
  }

  .hero-gradient {
    animation: scaleIn 1.5s ease-out forwards;
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: -1;
  }

  /* Button hover effect with responsive considerations */
  .primary-btn {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .primary-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }

  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }

  /* Responsive text sizing */
  @media (max-width: 768px) {
    .hero-title {
      font-size: 1.75rem !important;
    }
    
    .hero-subtitle {
      font-size: 1rem !important;
    }
    
    .primary-btn {
      padding: 0.5rem 1rem !important;
      font-size: 0.9rem !important;
    }
  }

  @media (max-width: 480px) {
    .hero-title {
      font-size: 1.5rem !important;
    }
    
    .hero-subtitle {
      font-size: 0.9rem !important;
    }
    
    .primary-btn {
      padding: 0.4rem 0.8rem !important;
      font-size: 0.8rem !important;
    }
  }
`;

const Hero = () => {
  const navigate = useNavigate();
  const slides = [
    {
      id: 1,
      title: "NeuroVision",
      description: "Welcome to NeuroVision, your AI-powered brain tumor segmentation tool.",
      button: { text: "Learn More", link: "/about", className: "primary-btn" }
    },
    {
      id: 2,
      title: "About Our Model",
      description: "Discover how our advanced AI model works for brain tumor segmentation.",
      button: { text: "Read More", link: "/about", className: "primary-btn" }
    },
    {
      id: 3,
      title: "Chat with Our NeuroVision Bot",
      description: "Get instant answers and assistance from our AI bot.",
      button: { text: "Start Chat", link: "/chat", className: "primary-btn" }
    },
    {
      id: 4,
      title: "Research on Brain Tumor Segmentation",
      description: "Explore cutting-edge research on brain tumor segmentation using AI-powered models like UNet3D and Swin UNETR.",
      button: {
        text: "Explore Research",
        // link: "/inputpatientneuro",    {python file api for visual segmentation }
        className: "primary-btn"
      }
    }
  ];

  useEffect(() => {
    // Add animation styles
    const styleElement = document.createElement('style');
    styleElement.innerHTML = animationCSS;
    document.head.appendChild(styleElement);

    // Enable smooth scrolling
    const smoothScrollHandler = (e) => {
      const href = e.currentTarget.getAttribute('href');

      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop,
            behavior: 'smooth'
          });
        }
      }
    };

    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', smoothScrollHandler);
    });

    return () => {
      // Clean up
      document.head.removeChild(styleElement);
      links.forEach(link => {
        link.removeEventListener('click', smoothScrollHandler);
      });
    };
  }, []);

  const handleNavigate = (link) => {
    if (link.startsWith('#')) {
      const targetId = link.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop,
          behavior: 'smooth'
        });
      }
    } else {
      navigate(link);
    }
  };

  return (
    <section className="hero w-full max-w-full">
      <div className="hero-gradient bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
      <div className="container mx-auto px-4">
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectFade]}
          spaceBetween={20}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false
          }}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          speed={1000}
          className="rounded-xl shadow-lg overflow-hidden"
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.id} className="hero-content text-center p-6">
              <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold hero-title">{slide.title}</h1>
                <p className="hero-subtitle mt-4 mx-auto max-w-2xl">{slide.description}</p>
                <div className="hero-cta mt-6">
                  <button
                    className={`${slide.button.className} px-6 py-3 rounded-lg`}
                    onClick={() => handleNavigate(slide.button.link)}
                  >
                    {slide.button.text}
                  </button>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

>>>>>>> 0de1c88 (Updated project files)
export default Hero;