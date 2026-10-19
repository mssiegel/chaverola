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
    let trackUntil = 0;

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

      const height = `${viewport?.height ?? window.innerHeight}px`;
      const top = `${viewport?.offsetTop ?? 0}px`;
      // Focus tracking samples each paint; unchanged measurements must not
      // invalidate the chat's layout again.
      if (world.style.getPropertyValue("--student-viewport-height") !== height)
        world.style.setProperty("--student-viewport-height", height);
      if (world.style.getPropertyValue("--student-viewport-top") !== top)
        world.style.setProperty("--student-viewport-top", top);
      if (!world.hasAttribute("data-chat-viewport"))
        world.dataset.chatViewport = "";
    };

    const trackFrame = () => {
      frame = 0;
      measure();
      if (phone.matches && performance.now() < trackUntil)
        frame = requestAnimationFrame(trackFrame);
    };

    const trackKeyboard = (event: FocusEvent) => {
      if (
        !phone.matches ||
        !(event.target instanceof HTMLTextAreaElement) ||
        !event.target.hasAttribute("data-chat-composer")
      )
        return;
      // Safari can delay viewport events during keyboard animation. Sample
      // available metrics before each paint on both focus and blur, with a
      // bounded tail for the animation; never poll throughout a conversation.
      trackUntil = performance.now() + 1000;
      measure();
      if (!frame) frame = requestAnimationFrame(trackFrame);
    };

    measure();
    // Apply delivered metrics in this event, without adding another frame
    // of lag to Safari's own viewport notifications.
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure);
    phone.addEventListener("change", measure);
    world.addEventListener("focusin", trackKeyboard);
    world.addEventListener("focusout", trackKeyboard);

    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      phone.removeEventListener("change", measure);
      world.removeEventListener("focusin", trackKeyboard);
      world.removeEventListener("focusout", trackKeyboard);
      clear();
    };
  }, [chatVisible]);

  return worldRef;
}
