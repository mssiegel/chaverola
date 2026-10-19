import { useLayoutEffect, useRef } from "react";

/**
 * Safari's keyboard shrinks/pans the visual viewport without resizing dvh.
 * Keep the phone chat in that visible rectangle, including its corner badge.
 * Desktop and the scrollable join/lobby screens keep their document layout.
 */
export function useStudentChatViewport(chatVisible: boolean) {
  const worldRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const world = worldRef.current;
    if (!chatVisible || !world) return;

    const phone = window.matchMedia("(width < 640px)");
    const viewport = window.visualViewport;
    let frame = 0;

    const clear = () => {
      delete world.dataset.chatViewport;
      world.style.removeProperty("--student-viewport-height");
      world.style.removeProperty("--student-viewport-top");
    };

    const measure = () => {
      if (!phone.matches) {
        clear();
        return;
      }
      // Pinch zoom is a reader action, not a keyboard resize. Keep the last
      // layout so zooming can magnify/pan it instead of reflowing the chat.
      if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;

      world.style.setProperty(
        "--student-viewport-height",
        `${viewport?.height ?? window.innerHeight}px`
      );
      world.style.setProperty(
        "--student-viewport-top",
        `${viewport?.offsetTop ?? 0}px`
      );
      world.dataset.chatViewport = "";
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    phone.addEventListener("change", schedule);

    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      phone.removeEventListener("change", schedule);
      clear();
    };
  }, [chatVisible]);

  return worldRef;
}
