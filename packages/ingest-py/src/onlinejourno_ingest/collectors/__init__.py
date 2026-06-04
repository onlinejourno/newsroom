"""Source collectors. Each collector implements the `Collector` protocol."""

from onlinejourno_ingest.collectors.rss import RSSCollector

__all__ = ["RSSCollector"]
