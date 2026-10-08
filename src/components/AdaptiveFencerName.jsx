import { useLayoutEffect, useRef, useState } from 'react';

// Mesure la police réellement chargée et la largeur disponible, y compris dans le détail étroit du tableau.
export default function AdaptiveFencerName({ name, country }) {
  const heading = useRef(null);
  const [fontSize, setFontSize] = useState(32);
  useLayoutEffect(() => {
    const element = heading.current;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let active = true;
    const fit = () => {
      if (!active || !context) return;
      const width = element.clientWidth;
      if (!width) return;
      const style = getComputedStyle(element);
      context.font = `${style.fontWeight} 32px ${style.fontFamily}`;
      const longest = Math.max(...String(name || '').split(/\s+/).map(word => context.measureText(word).width), 1);
      const total = Math.max(context.measureText(name || '').width, 1);
      // Chaque mot tient en entier ; trois lignes visées pour un nom composé.
      const size = Math.min(32, 32 * (width - 2) / longest, 32 * Math.sqrt(width * 3 / total));
      setFontSize(Math.max(10, Math.floor(size)));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    document.fonts?.ready.then(fit);
    fit();
    return () => { active = false; observer.disconnect(); };
  }, [name]);
  return <h2 ref={heading} className="adaptive-fencer-name" style={{ fontSize }}>
    <span>{name}</span>
    {country && <small>{country}</small>}
  </h2>;
}
