<?php
/**
 * OnlineJourno theme functions.
 *
 * @package OnlineJourno
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

if ( ! function_exists( 'onlinejourno_setup' ) ) :
	function onlinejourno_setup() {
		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'automatic-feed-links' );
		add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
		add_theme_support( 'custom-logo', array( 'height' => 40, 'width' => 40, 'flex-height' => true, 'flex-width' => true ) );
		add_theme_support( 'editor-styles' );

		register_nav_menus( array(
			'primary' => __( 'Primary Masthead', 'onlinejourno' ),
			'footer'  => __( 'Footer', 'onlinejourno' ),
		) );
	}
endif;
add_action( 'after_setup_theme', 'onlinejourno_setup' );

/**
 * Enqueue fonts + the theme stylesheet.
 */
function onlinejourno_assets() {
	// Source Serif 4 (text), IBM Plex Sans (labels/UI), IBM Plex Mono (data).
	// Karnata F Kittel (display) is self-hosted via @font-face in style.css.
	wp_enqueue_style(
		'onlinejourno-fonts',
		'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
		array(),
		null
	);
	wp_enqueue_style( 'onlinejourno-style', get_stylesheet_uri(), array( 'onlinejourno-fonts' ), wp_get_theme()->get( 'Version' ) );
}
add_action( 'wp_enqueue_scripts', 'onlinejourno_assets' );

/**
 * Editorial excerpt: length + read-more.
 */
function onlinejourno_excerpt_length( $length ) { return 32; }
add_filter( 'excerpt_length', 'onlinejourno_excerpt_length' );

function onlinejourno_excerpt_more( $more ) { return '…'; }
add_filter( 'excerpt_more', 'onlinejourno_excerpt_more' );

/**
 * Author initials for the byline avatar.
 */
function onlinejourno_initials( $name ) {
	$parts = preg_split( '/\s+/', trim( $name ) );
	$out = '';
	foreach ( array_slice( $parts, 0, 2 ) as $p ) { $out .= mb_strtoupper( mb_substr( $p, 0, 1 ) ); }
	return $out ? $out : 'OJ';
}

/**
 * The brand kicker for a post = its primary category, uppercased.
 */
function onlinejourno_kicker( $post_id = null ) {
	$cats = get_the_category( $post_id );
	if ( ! empty( $cats ) ) { return strtoupper( $cats[0]->name ); }
	return 'ONLINEJOURNO';
}
