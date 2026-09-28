import React, { useState, useEffect } from 'react';

export const Typewriter: React.FC<{ strings: string[], delay?: number }> = ({ strings, delay = 2000 }) => {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(100);

  useEffect(() => {
    let timer = setTimeout(() => {
      const i = loopNum % strings.length;
      const fullText = strings[i];

      if (isDeleting) {
        setText(fullText.substring(0, text.length - 1));
        setTypingSpeed(40); // delete speed
      } else {
        setText(fullText.substring(0, text.length + 1));
        setTypingSpeed(100); // typing speed
      }

      if (!isDeleting && text === fullText) {
        setTypingSpeed(delay);
        setIsDeleting(true);
      } else if (isDeleting && text === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
        setTypingSpeed(500); // pause before next word
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, typingSpeed, strings, delay]);

  return (
    <span className="inline-block min-h-[1.5em] border-r-2 border-cyan-400 pr-1 animate-pulse">
      {text}
    </span>
  );
};
