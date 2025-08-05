import React, { useEffect } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import "./styles.css";

export default function Hero() {
  const {siteConfig} = useDocusaurusContext();
  
  useEffect(() => {
    // Load GitHub buttons script
    const script = document.createElement('script');
    script.src = 'https://buttons.github.io/buttons.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    return () => {
      // Clean up
      document.body.removeChild(script);
    };
  }, []);
  
  return (
    <div className="hero-container">
      <div className="hero-content">
        <h1 className="hero-title">Volcano</h1>
        <p className="hero-subtitle">Cloud native batch scheduling system for compute-intensive workloads</p>
        
        <div className="hero-actions">
          <a className="github-button" 
             href="https://github.com/volcano-sh/volcano" 
             data-size="large" 
             data-icon="octicon-star" 
             data-show-count="true" 
             aria-label="Star volcano-sh/volcano on GitHub">
            Star
          </a>
          
          <Link className="hero-cta-button" to="/docs/Home/Introduction">
            Learn More About Volcano
          </Link>
        </div>
      </div>
    </div>
  );
}
