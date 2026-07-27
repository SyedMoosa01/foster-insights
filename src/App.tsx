import { useEffect, useState } from "react";

import { loadSampleModel } from "./api/analyticsApi";
import { CountiesPage } from "./pages/CountiesPage";
import { HomePage } from "./pages/HomePage";
import { MethodologyPage } from "./pages/MethodologyPage";
import { ProvidersPage } from "./pages/ProvidersPage";
import { RecruitmentPage } from "./pages/RecruitmentPage";
import { RetentionPage } from "./pages/RetentionPage";
import { UploadPage } from "./pages/UploadPage";
import type { AppModel, PageName } from "./types";

const pages: Array<[PageName, string]> = [
  ["home", "Home"],
  ["upload", "Data Upload"],
  ["recruitment", "Recruitment"],
  ["retention", "Retention"],
  ["counties", "Counties"],
  ["providers", "Foster Homes"],
  ["methodology", "Methodology"],
];

const validPages = new Set<PageName>(
  pages.map(([pageName]) => pageName),
);

interface NavigationState {
  page: PageName;
  selectedProvider: string | null;
  selectedCounty: string | null;
}

function getPageUrl(page: PageName): string {
  return `#/${page}`;
}

function getPageFromHash(): PageName {
  const page = window.location.hash
    .replace(/^#\/?/, "")
    .split("/")[0] as PageName;

  return validPages.has(page) ? page : "home";
}

function getInitialNavigation(): NavigationState {
  const historyState =
    window.history.state as Partial<NavigationState> | null;

  return {
    page:
      historyState?.page && validPages.has(historyState.page)
        ? historyState.page
        : getPageFromHash(),
    selectedProvider:
      typeof historyState?.selectedProvider === "string"
        ? historyState.selectedProvider
        : null,
    selectedCounty:
      typeof historyState?.selectedCounty === "string"
        ? historyState.selectedCounty
        : null,
  };
}

export default function App() {
  const [initialNavigation] = useState(getInitialNavigation);

  const [page, setPage] = useState<PageName>(
    initialNavigation.page,
  );

  const [selectedProvider, setSelectedProvider] = useState<
    string | null
  >(initialNavigation.selectedProvider);

  const [selectedCounty, setSelectedCounty] = useState<
    string | null
  >(initialNavigation.selectedCounty);

  const [model, setModel] = useState<AppModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollToTop = (): void => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const applyNavigation = (
    navigation: NavigationState,
  ): void => {
    setPage(navigation.page);
    setSelectedProvider(navigation.selectedProvider);
    setSelectedCounty(navigation.selectedCounty);
    scrollToTop();
  };

  const pushNavigation = (
    navigation: NavigationState,
  ): void => {
    window.history.pushState(
      navigation,
      "",
      getPageUrl(navigation.page),
    );

    applyNavigation(navigation);
  };

  const loadSample = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      setModel(await loadSampleModel());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load sample data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSample();
  }, []);

  useEffect(() => {
    window.history.replaceState(
      initialNavigation,
      "",
      getPageUrl(initialNavigation.page),
    );

    const handlePopState = (
      event: PopStateEvent,
    ): void => {
      const historyState =
        event.state as Partial<NavigationState> | null;

      applyNavigation({
        page:
          historyState?.page &&
            validPages.has(historyState.page)
            ? historyState.page
            : getPageFromHash(),
        selectedProvider:
          typeof historyState?.selectedProvider === "string"
            ? historyState.selectedProvider
            : null,
        selectedCounty:
          typeof historyState?.selectedCounty === "string"
            ? historyState.selectedCounty
            : null,
      });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState,
      );
    };
  }, []);

  const navigate = (nextPage: PageName): void => {
    if (
      page === nextPage &&
      selectedProvider === null &&
      selectedCounty === null
    ) {
      scrollToTop();
      return;
    }

    pushNavigation({
      page: nextPage,
      selectedProvider: null,
      selectedCounty: null,
    });
  };

  const openProvider = (providerId: string): void => {
    pushNavigation({
      page: "providers",
      selectedProvider: providerId,
      selectedCounty: null,
    });
  };

  const openCounty = (countyName: string): void => {
    pushNavigation({
      page: "counties",
      selectedProvider: null,
      selectedCounty: countyName,
    });
  };

  const closeProvider = (): void => {
    pushNavigation({
      page: "providers",
      selectedProvider: null,
      selectedCounty: null,
    });
  };

  const closeCounty = (): void => {
    pushNavigation({
      page: "counties",
      selectedProvider: null,
      selectedCounty: null,
    });
  };

  const applyModel = (nextModel: AppModel): void => {
    setModel(nextModel);
    navigate("home");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div>
          <p>Loading sample data...</p>
          <p>
            If you opened this app on Vercel, the data may take a minute or two
            to load because the backend runs on a free-tier service.
          </p>
        </div>
      );
    }

    if (error) {
      return <div className="error-box">{error}</div>;
    }

    if (!model && page !== "upload") {
      return (
        <div className="error-box">
          Upload or restore the three CSV datasets first.
        </div>
      );
    }

    if (page === "upload") {
      return (
        <UploadPage
          applyModel={applyModel}
          restore={loadSample}
        />
      );
    }

    if (!model) {
      return null;
    }

    switch (page) {
      case "home":
        return (
          <HomePage
            model={model}
            navigate={navigate}
            openProvider={openProvider}
            openCounty={openCounty}
          />
        );

      case "recruitment":
        return (
          <RecruitmentPage
            model={model}
            openCounty={openCounty}
          />
        );

      case "retention":
        return (
          <RetentionPage
            model={model}
            openProvider={openProvider}
          />
        );

      case "counties":
        return (
          <CountiesPage
            model={model}
            selectedCounty={selectedCounty}
            openCounty={openCounty}
            closeCounty={closeCounty}
            openProvider={openProvider}
          />
        );

      case "providers":
        return (
          <ProvidersPage
            model={model}
            selectedProvider={selectedProvider}
            openProvider={openProvider}
            closeProvider={closeProvider}
          />
        );

      default:
        return <MethodologyPage />;
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <div className="brand">Foster Insights</div>

          <div className="subtitle">
            Illinois foster-home capacity decision support
          </div>
        </div>

        <div className="status-pill">
          {loading
            ? "Loading…"
            : model
              ? `Ready · ${model.children.length.toLocaleString()} children · ${model.providers.length.toLocaleString()} homes`
              : "No data"}
        </div>
      </header>

      <nav className="nav" aria-label="Main navigation">
        {pages.map(([pageKey, label]) => (
          <button
            key={pageKey}
            type="button"
            className={page === pageKey ? "active" : ""}
            onClick={() => navigate(pageKey)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="page">{renderContent()}</main>
    </>
  );
}