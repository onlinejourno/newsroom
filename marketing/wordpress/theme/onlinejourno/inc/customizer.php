<?php
/**
 * Homepage copy → the Customizer.
 *
 * Makes the front-page hero and ethic line editable from Appearance → Customize
 * without touching code. The product cards and the "how it's built" grid are
 * structural — edit those in front-page.php. Defaults match the portal homepage.
 *
 * @package OnlineJourno
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

function onlinejourno_customize_register( $wp_customize ) {
	$panel = 'oj_homepage';
	$wp_customize->add_panel( $panel, array(
		'title'       => __( 'Homepage', 'onlinejourno' ),
		'description' => __( 'Edit the front-page hero and the ethic line. The product cards and principles are structural and live in the theme (front-page.php).', 'onlinejourno' ),
		'priority'    => 30,
	) );

	// add( setting id, label, default, section, type[text|textarea|url] )
	$add = function ( $id, $label, $default, $section, $type = 'text' ) use ( $wp_customize ) {
		$sanitize = 'sanitize_text_field';
		if ( 'url' === $type ) { $sanitize = 'esc_url_raw'; }
		elseif ( 'textarea' === $type ) { $sanitize = 'sanitize_textarea_field'; }
		$wp_customize->add_setting( $id, array(
			'default'           => $default,
			'sanitize_callback' => $sanitize,
			'transport'         => 'refresh',
		) );
		$wp_customize->add_control( $id, array(
			'label'   => $label,
			'section' => $section,
			'type'    => ( 'url' === $type ) ? 'url' : $type,
		) );
	};

	// ── Hero ────────────────────────────────────────────────────────────────
	$wp_customize->add_section( 'oj_hero', array( 'title' => __( 'Hero', 'onlinejourno' ), 'panel' => $panel ) );
	$add( 'oj_hero_kicker', __( 'Eyebrow', 'onlinejourno' ), 'Journalistic Agentic Task Orchestration', 'oj_hero' );
	$add( 'oj_hero_title', __( 'Headline', 'onlinejourno' ), 'Bring a journalism task. Get an answer you can act on.', 'oj_hero' );
	$add( 'oj_hero_dek', __( 'Blurb', 'onlinejourno' ), 'OnlineJourno takes a reporter\'s task in plain language, decomposes it, composes a library of AI agents and tools to do the research, and returns a structured, source-linked result — so the intelligence that today pools at the top of the newsroom finally reaches the reporter at the base. By a journalist, for journalists.', 'oj_hero', 'textarea' );
	$add( 'oj_hero_btn1_label', __( 'Button 1 — label', 'onlinejourno' ), "Let's work together", 'oj_hero' );
	$add( 'oj_hero_btn1_url', __( 'Button 1 — link', 'onlinejourno' ), '/audit/', 'oj_hero', 'url' );
	$add( 'oj_hero_btn2_label', __( 'Button 2 — label', 'onlinejourno' ), 'Explore the free tools', 'oj_hero' );
	$add( 'oj_hero_btn2_url', __( 'Button 2 — link', 'onlinejourno' ), 'https://tools.onlinejourno.com/', 'oj_hero', 'url' );

	// ── Ethic line ──────────────────────────────────────────────────────────
	$wp_customize->add_section( 'oj_ethic', array( 'title' => __( 'Ethic line', 'onlinejourno' ), 'panel' => $panel ) );
	$add( 'oj_ethic_label', __( 'Label', 'onlinejourno' ), 'The ethic', 'oj_ethic' );
	$add( 'oj_ethic_statement', __( 'Statement', 'onlinejourno' ), 'The machine surfaces. The journalist decides. It never publishes.', 'oj_ethic', 'textarea' );
}
add_action( 'customize_register', 'onlinejourno_customize_register' );
