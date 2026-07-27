/**
 * Reusable Back to top button.
 *
 * Appears after the user scrolls down and smoothly returns the page to the top.
 * Styling is maintained in the shared component stylesheet.
 */

import {
  useEffect,
  useState,
} from "react";
import "../styles/back-to-top.css";

interface BackToTopProps {
  showAfter?: number;
}


export function BackToTop({
  showAfter = 400,
}: BackToTopProps) {
  const [visible, setVisible] =
    useState(false);

  useEffect(() => {
    const handleScroll = (): void => {
      setVisible(
        window.scrollY > showAfter,
      );
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true },
    );

    handleScroll();

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, [showAfter]);

  const scrollToTop = (): void => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible) {
    return null;
  }

  return (
      <button
        type="button"
        className="back-to-top"
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <span
          className="back-to-top-icon"
          aria-hidden="true"
        >
          ↑
        </span>

        Back to top
      </button>
  );
}