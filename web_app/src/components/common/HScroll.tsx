import React, { useEffect, useRef, useState } from "react";

/**
 * Scroll container for wide tables with ONE horizontal slider, pinned to the
 * bottom edge of the scrolling window (position: sticky) so it is always
 * within reach while any part of the table is on screen -- a tall table's
 * normal bottom scrollbar sits far below the fold or behind a modal footer.
 * The table's own scrollbar is clipped out of view, so there is never a
 * second one; sideways trackpad/touch scrolling on the table still works.
 * The slider only appears when the content is wider than the container.
 */
export default function HScroll({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [needed, setNeeded] = useState(false);
  const fromTop = useRef(false);
  const fromMain = useRef(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.scrollWidth);
      setNeeded(el.scrollWidth > el.clientWidth + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [children]);

  const onTop = () => {
    if (fromMain.current) {
      fromMain.current = false;
      return;
    }
    fromTop.current = true;
    if (mainRef.current && topRef.current) mainRef.current.scrollLeft = topRef.current.scrollLeft;
  };
  const onMain = () => {
    if (fromTop.current) {
      fromTop.current = false;
      return;
    }
    fromMain.current = true;
    if (mainRef.current && topRef.current) topRef.current.scrollLeft = mainRef.current.scrollLeft;
  };

  return (
    <div>
      <div className="overflow-hidden">
        <div
          ref={mainRef}
          onScroll={onMain}
          className={className}
          style={needed ? { marginBottom: -24, paddingBottom: 24 } : undefined}
        >
          {children}
        </div>
      </div>
      {needed && (
        <div
          ref={topRef}
          onScroll={onTop}
          className="overflow-x-auto overflow-y-hidden bg-white/95 backdrop-blur-sm"
          style={{ position: "sticky", bottom: 0, zIndex: 20, height: 18, borderTop: "1px solid #e2e8f0" }}
          aria-label="Scroll table sideways"
        >
          <div style={{ width, height: 1 }} />
        </div>
      )}
    </div>
  );
}
