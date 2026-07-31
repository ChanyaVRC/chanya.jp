export interface NavItem {
  readonly label: string;
  readonly href: string;
}

export interface Project {
  readonly title: string;
  readonly kind: string;
  readonly description: string;
  readonly href: string;
  readonly action: string;
  readonly external: boolean;
  readonly stack: readonly string[];
}

export interface GalleryItem {
  readonly id: string;
  readonly title: string;
  readonly date: string | null;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface ExternalLink {
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly group: "contact" | "social" | "community" | "store";
}

export interface PageMetadata {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly robots?: "noindex, nofollow";
}

export interface CommandItem {
  readonly label: string;
  readonly detail: string;
  readonly href: string;
  readonly external: boolean;
}
