(function() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  let theme = localStorage.getItem("theme") || "light";
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    btn.textContent = "☀️";
  }

  btn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");

    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");

    btn.textContent = isDark ? "☀️" : "🌙";
  });
})();
