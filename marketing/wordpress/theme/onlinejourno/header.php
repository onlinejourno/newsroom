<?php
/**
 * Header: masthead nav.
 *
 * @package OnlineJourno
 */
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php if ( is_front_page() ) : ?>
	<link rel="canonical" href="<?php echo esc_url( home_url( '/' ) ); ?>">
	<meta name="description" content="OnlineJourno — newsroom tools for journalists. An open suite: source monitoring, framing, story grading, a predictive calendar, and free SEO tools.">
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="OnlineJourno">
	<meta property="og:title" content="Newsroom tools for journalists — OnlineJourno">
	<meta property="og:description" content="Monitor sources, read how stories are framed, plan ahead, grade a story — give every piece the reach it earns.">
	<meta property="og:url" content="<?php echo esc_url( home_url( '/' ) ); ?>">
	<meta name="twitter:card" content="summary_large_image">
	<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","@id":"https://onlinejourno.com/#org","name":"OnlineJourno","url":"https://onlinejourno.com","description":"Editorial intelligence for newsrooms — the JATO suite.","sameAs":["https://onlinejournalism.in","https://github.com/onlinejourno"]}</script>
	<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","@id":"https://onlinejourno.com/#website","url":"https://onlinejourno.com","name":"OnlineJourno","publisher":{"@id":"https://onlinejourno.com/#org"}}</script>
	<?php endif; ?>
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header class="site-header">
	<div class="container masthead">
		<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
			<?php if ( has_custom_logo() ) : the_custom_logo(); else : ?>
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/img/mark.png' ); ?>" alt="<?php bloginfo( 'name' ); ?>">
			<?php endif; ?>
			<span class="word" style="font-family:var(--font-display);font-weight:400;">OnlineJourno<span style="color:var(--accent)">.</span></span>
		</a>

		<nav class="main-nav" aria-label="<?php esc_attr_e( 'Primary', 'onlinejourno' ); ?>">
			<?php
			if ( has_nav_menu( 'primary' ) ) {
				wp_nav_menu( array(
					'theme_location' => 'primary',
					'container'      => false,
					'items_wrap'     => '%3$s',
					'depth'          => 1,
				) );
			} else {
				// Fallback menu — the JATO ecosystem nav (current names + live pages).
				// For a grouped nav with a "Products" dropdown, build a menu at the
				// 'primary' location (Appearance > Menus) — it overrides this fallback.
				echo '<a href="' . esc_url( home_url( '/' ) ) . '">Home</a>';
				echo '<a class="nav-pulse" href="' . esc_url( home_url( '/in/' ) ) . '">Pulse</a>';
				echo '<a href="' . esc_url( home_url( '/newsroom/' ) ) . '">Newsroom</a>';
				echo '<a href="' . esc_url( home_url( '/galley/' ) ) . '">Galley</a>';
				echo '<a href="' . esc_url( home_url( '/tools/' ) ) . '">Tools</a>';
				echo '<a href="' . esc_url( home_url( '/daybook/' ) ) . '">Daybook</a>';
				echo '<a href="' . esc_url( home_url( '/frontmatter/' ) ) . '">Frontmatter</a>';
				echo '<a href="' . esc_url( home_url( '/docs/' ) ) . '">Docs</a>';
				echo '<a href="' . esc_url( home_url( '/about/' ) ) . '">About</a>';
				echo '<a href="https://github.com/onlinejourno" target="_blank" rel="noopener">GitHub</a>';
			}
			?>
		</nav>
	</div>
</header>

<div class="site-content">
