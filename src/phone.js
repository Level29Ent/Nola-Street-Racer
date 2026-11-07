// Audio URLs are created locally, never uploaded, and revoked on playlist replacement.
export function setupPhone($) {
  const audio = $("music-player");
  audio.volume = 0.5;
  let urls = [],
    index = -1,
    resume = false;
  function play(i) {
    if (!urls.length) return;
    index = (i + urls.length) % urls.length;
    audio.src = urls[index].url;
    audio.play().catch(() => {
      $("music-status").textContent =
        "Tap the audio play control to start playback.";
    });
    $("music-status").textContent = urls[index].name;
    [...$("playlist").children].forEach((li, n) =>
      li.firstChild.classList.toggle("selected", n === index),
    );
  }
  $("music-files").onchange = (e) => {
    audio.pause();
    audio.removeAttribute("src");
    urls.forEach((t) => URL.revokeObjectURL(t.url));
    urls = [...e.target.files]
      .filter((f) => f.type.startsWith("audio/"))
      .map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    $("playlist").replaceChildren();
    urls.forEach((t, i) => {
      const li = document.createElement("li"),
        b = document.createElement("button");
      b.textContent = t.name;
      b.onclick = () => play(i);
      li.append(b);
      $("playlist").append(li);
    });
    if (urls.length) play(0);
  };
  $("music-next").onclick = () => play(index + 1);
  audio.onended = () => play(index + 1);
  audio.onerror = () => {
    $("music-status").textContent =
      "This audio format could not be played. Try MP3, AAC or WAV supported by your browser.";
  };
  $("music-volume").oninput = (e) => {
    audio.volume = Number(e.target.value);
  };
  return {
    pause(paused) {
      if (paused) {
        if (!audio.paused) {
          resume = true;
          audio.pause();
        }
      } else if (resume) {
        resume = false;
        audio.play().catch(() => {});
      }
    },
  };
}
