export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Extract custom company name from query params or route
    // Support: ?c=Old+GOAT+Coatings or ?name=Old+GOAT+Coatings or /demo/Old-GOAT-Coatings
    let company = url.searchParams.get("c") || url.searchParams.get("name") || url.searchParams.get("company") || "";

    if (!company && url.pathname.startsWith("/demo/")) {
      const slug = url.pathname.replace(/^\/demo\/?/, "").split("/")[0];
      if (slug) {
        company = decodeURIComponent(slug)
          .replace(/[-_+]+/g, " ")
          .trim()
          .replace(/\b\w/g, char => char.toUpperCase());
      }
    }

    company = company.trim();

    // 2. Resolve request against static assets
    let assetRequest = request;
    if (url.pathname.startsWith("/demo/")) {
      const rootUrl = new URL(request.url);
      rootUrl.pathname = "/";
      assetRequest = new Request(rootUrl.toString(), request);
    }

    const response = await env.ASSETS.fetch(assetRequest);

    // 3. Dynamic Edge Personalization via HTMLRewriter
    const contentType = response.headers.get("content-type") || "";
    if (company && contentType.includes("text/html")) {
      const formattedTitle = `${company} | 1-Tap Garage Floor Estimate`;
      const formattedDesc = `${company} installs industrial-grade epoxy flake systems and polyaspartic coatings. Diamond-ground slab prep, 1-day installation. Get a free instant estimate.`;

      // Safe JSON representation for injection
      const safeCompanyJson = JSON.stringify(company);

      const clientScript = `
<script>
(function() {
  window.__CUSTOM_COMPANY__ = ${safeCompanyJson};
  
  function applyBrand() {
    var c = window.__CUSTOM_COMPANY__;
    if (!c) return;

    // Pin document title
    if (document.title !== "${company} | 1-Tap Garage Floor Estimate") {
      document.title = "${company} | 1-Tap Garage Floor Estimate";
    }

    // Replace text nodes mentioning generic Apex Epoxy Co.
    var walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while (node = walker.nextNode()) {
      if (node.nodeValue && (node.nodeValue.indexOf("Apex Epoxy Co.") !== -1 || node.nodeValue.indexOf("Apex Epoxy") !== -1)) {
        node.nodeValue = node.nodeValue.replace(/Apex Epoxy Co\\./g, c).replace(/Apex Epoxy/g, c);
      }
    }

    // Adapt hero H1 headline to avoid 'Metallic' turn-off
    var h1 = document.querySelector('h1');
    if (h1 && (h1.textContent.indexOf("Metallic") !== -1 || h1.textContent.indexOf("Apex") !== -1)) {
      h1.textContent = c + " — Premium Garage Floor Coatings";
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBrand);
  } else {
    applyBrand();
  }

  window.addEventListener('load', function() {
    applyBrand();
    if (document.body) {
      var observer = new MutationObserver(function() {
        applyBrand();
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  });
})();
</script>
`;

      return new HTMLRewriter()
        .on("title", {
          element(el) {
            el.setInnerContent(formattedTitle);
          }
        })
        .on('meta[property="og:title"]', {
          element(el) {
            el.setAttribute("content", formattedTitle);
          }
        })
        .on('meta[property="og:site_name"]', {
          element(el) {
            el.setAttribute("content", company);
          }
        })
        .on('meta[property="og:description"]', {
          element(el) {
            el.setAttribute("content", formattedDesc);
          }
        })
        .on('meta[name="twitter:title"]', {
          element(el) {
            el.setAttribute("content", formattedTitle);
          }
        })
        .on('meta[name="twitter:description"]', {
          element(el) {
            el.setAttribute("content", formattedDesc);
          }
        })
        .on('meta[name="author"]', {
          element(el) {
            el.setAttribute("content", company);
          }
        })
        .on("head", {
          element(el) {
            el.append(clientScript, { html: true });
          }
        })
        .transform(response);
    }

    return response;
  }
};
