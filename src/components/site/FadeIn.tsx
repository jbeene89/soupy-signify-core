import { useEffect, useRef, useState } from "react";

export function FadeIn({ children, className = "", as: As = "div" as any }: { children: React.ReactNode; className?: string; as?: any }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <As ref={ref} className={`fade-in ${visible ? "visible" : ""} ${className}`}>
      {children}
    </As>
  );
}
