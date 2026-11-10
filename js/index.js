// McMaster Micromouse - News & Articles Manager

function formatDate(dateStr) {
	if (!dateStr) return "";
	try {
		const [year, month, day] = dateStr.split("-").map(Number);
		if (year && month && day) {
			const date = new Date(year, month - 1, day);
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric"
			});
		}
	} catch (e) {
		console.error("Error formatting date:", e);
	}
	return dateStr;
}

function getArticleId(article, index) {
	if (article.id !== undefined && article.id !== null) {
		return String(article.id);
	}
	// Slugify title or fallback to index
	if (article.title) {
		const slug = article.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)+/g, "");
		if (slug) return slug;
	}
	return String(index);
}

let allArticles = [];

function renderCards(articles, container, isHomePage) {
	container.innerHTML = "";

	if (!articles || articles.length === 0) {
		container.innerHTML = "<p class='news-empty'>No news articles found.</p>";
		return;
	}

	articles.forEach((article) => {
		const card = document.createElement("article");
		card.className = "news-card";
		card.setAttribute("data-id", article.uniqueId);

		let imgHtml = "";
		if (article.img_file) {
			imgHtml = `
				<div class="news-card-img-wrapper">
					<img src="${article.img_file}" alt="${article.title}" class="news-card-img" loading="lazy">
				</div>
			`;
		}

		const formattedDate = formatDate(article.date);

		card.innerHTML = `
			${imgHtml}
			<div class="news-card-body">
				${formattedDate ? `<span class="news-card-date">${formattedDate}</span>` : ""}
				<h3 class="news-card-title">${article.title}</h3>
				<p class="news-card-snippet">${article.content || ""}</p>
				<span class="news-card-cta">
					Read More <i class="fa-solid fa-arrow-right"></i>
				</span>
			</div>
		`;

		card.addEventListener("click", () => {
			openArticle(article.uniqueId);
		});

		container.appendChild(card);
	});
}

function openArticle(articleId, updateHistory = true) {
	const article = allArticles.find((a) => a.uniqueId === String(articleId));
	if (!article) return;

	const grid = document.getElementById("news-grid");
	const articleView = document.getElementById("article-view");
	const viewMoreBtn = document.getElementById("news-view-more");
	const section = document.getElementById("news-section") || document.getElementById("main");

	if (!grid || !articleView) return;

	// Hide cards and view more button
	grid.style.display = "none";
	if (viewMoreBtn) {
		viewMoreBtn.style.display = "none";
	}

	// Format article content into paragraphs
	const paragraphs = (article.content || "")
		.split(/\n\s*\n/)
		.filter((p) => p.trim().length > 0)
		.map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
		.join("");

	let imgHtml = "";
	if (article.img_file) {
		imgHtml = `
			<div class="article-img-container">
				<img src="${article.img_file}" alt="${article.title}" class="article-img">
			</div>
		`;
	}

	const isNewsPage = window.location.pathname.includes("/news");
	const backLabel = isNewsPage ? "← Back to all news" : "← Back to news";

	articleView.innerHTML = `
		<div class="article-actions">
			<button class="article-back-btn" id="article-back-btn">
				${backLabel}
			</button>
		</div>
		<header class="article-header">
			${article.date ? `<div class="article-date">${formatDate(article.date)}</div>` : ""}
			<h1 class="article-title">${article.title}</h1>
		</header>
		${imgHtml}
		<div class="article-body">
			${paragraphs}
		</div>
		<div class="article-footer">
			<button class="article-back-btn" id="article-footer-back-btn">
				${backLabel}
			</button>
			${!isNewsPage ? `<a class="button article-all-news-btn" href="/news">View All News</a>` : ""}
		</div>
	`;

	articleView.style.display = "block";

	// Attach back button listeners
	const handleBack = () => closeArticle();
	const topBackBtn = document.getElementById("article-back-btn");
	const footerBackBtn = document.getElementById("article-footer-back-btn");
	if (topBackBtn) topBackBtn.addEventListener("click", handleBack);
	if (footerBackBtn) footerBackBtn.addEventListener("click", handleBack);

	if (updateHistory) {
		const newUrl = `${window.location.pathname}?article=${encodeURIComponent(articleId)}`;
		window.history.pushState({ articleId }, "", newUrl);
	}

	if (section && typeof section.scrollIntoView === "function") {
		section.scrollIntoView({ behavior: "smooth", block: "start" });
	}
}

function closeArticle(updateHistory = true) {
	const grid = document.getElementById("news-grid");
	const articleView = document.getElementById("article-view");
	const viewMoreBtn = document.getElementById("news-view-more");
	const section = document.getElementById("news-section") || document.getElementById("main");

	if (!grid || !articleView) return;

	articleView.style.display = "none";
	articleView.innerHTML = "";
	grid.style.display = "grid";

	const isHomePage = !window.location.pathname.includes("/news");
	if (viewMoreBtn && isHomePage) {
		viewMoreBtn.style.display = "flex";
	}

	if (updateHistory) {
		window.history.pushState({}, "", window.location.pathname);
	}

	if (section && typeof section.scrollIntoView === "function") {
		section.scrollIntoView({ behavior: "smooth", block: "start" });
	}
}

function checkUrlForArticle() {
	const params = new URLSearchParams(window.location.search);
	const articleParam = params.get("article");
	if (articleParam) {
		openArticle(articleParam, false);
		return true;
	}

	if (window.location.hash && window.location.hash.startsWith("#article-")) {
		const hashId = window.location.hash.replace("#article-", "");
		if (hashId) {
			openArticle(hashId, false);
			return true;
		}
	}
	return false;
}

window.addEventListener("popstate", (event) => {
	if (event.state && event.state.articleId) {
		openArticle(event.state.articleId, false);
	} else {
		const params = new URLSearchParams(window.location.search);
		const articleParam = params.get("article");
		if (articleParam) {
			openArticle(articleParam, false);
		} else {
			closeArticle(false);
		}
	}
});

async function loadArticles() {
	const grid = document.getElementById("news-grid");
	if (!grid) return;

	try {
		const response = await fetch("/news/news.json");
		if (!response.ok) {
			throw new Error(`Failed to load news: ${response.statusText}`);
		}
		const rawArticles = await response.json();

		// Assign uniqueId to each article
		allArticles = rawArticles.map((article, index) => ({
			...article,
			uniqueId: getArticleId(article, index)
		}));

		// Sort by date descending (newest first)
		allArticles.sort((a, b) => {
			const dateA = new Date(a.date || 0);
			const dateB = new Date(b.date || 0);
			return dateB - dateA;
		});

		const isHomePage = !window.location.pathname.includes("/news");

		if (isHomePage) {
			const recentArticles = allArticles.slice(0, 3);
			renderCards(recentArticles, grid, true);
		} else {
			renderCards(allArticles, grid, false);
		}

		checkUrlForArticle();
	} catch (error) {
		console.error("Error loading articles:", error);
		if (grid) {
			grid.innerHTML = "<p class='news-error'>Unable to load news updates at this time.</p>";
		}
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		loadArticles();
	});
} else {
	loadArticles();
}
