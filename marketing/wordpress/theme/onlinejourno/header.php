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
				// Fallback menu — the cross-property ecosystem nav.
				echo '<a href="' . esc_url( home_url( '/' ) ) . '">Home</a>';
				echo '<a href="https://app.onlinejourno.com/">Platform</a>';
				echo '<a href="https://tools.onlinejourno.com/">Tools</a>';
				echo '<a href="https://editorial-optimiser.onlinejourno.com/">Editorial Optimiser</a>';
				echo '<a href="' . esc_url( home_url( '/about/' ) ) . '">About</a>';
			}
			?>
		</nav>

		<div class="user">
			<?php if ( is_user_logged_in() ) :
				$cu = wp_get_current_user();
				echo esc_html( $cu->display_name ) . ' · ';
				echo '<a href="' . esc_url( wp_logout_url( home_url() ) ) . '">Sign out</a>';
			else :
				echo '<a href="' . esc_url( wp_login_url() ) . '">Sign in</a>';
			endif; ?>
		</div>
	</div>
</header>

<div class="site-content">
