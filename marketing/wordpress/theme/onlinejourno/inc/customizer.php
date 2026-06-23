<?php
/**
 * Homepage copy → the Customizer.
 *
 * Makes the front page (front-page.php) editable from Appearance → Customize
 * without touching code. Every default below matches the original hard-coded
 * copy, so activating/updating the theme changes nothing until you edit.
 *
 * @package OnlineJourno
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

function onlinejourno_customize_register( $wp_customize ) {
	$panel = 'oj_homepage';
	$wp_customize->add_panel( $panel, array(
		'title'       => __( 'Homepage', 'onlinejourno' ),
		'description' => __( 'Edit the front-page copy — hero, feature cards, and the ethic line. The "suite" links are structural and stay in the theme.', 'onlinejourno' ),
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
	$add( 'oj_hero_kicker', __( 'Eyebrow', 'onlinejourno' ), 'Editorial intelligence for newsrooms', 'oj_hero' );
	$add( 'oj_hero_title', __( 'Headline', 'onlinejourno' ), 'Give every story a fair chance.', 'oj_hero' );
	$add( 'oj_hero_dek', __( 'Blurb', 'onlinejourno' ), 'OnlineJourno monitors your sources, reads how stories are being framed, and delivers desk-ready briefs — so reporters spend their time on judgement, not on watching feeds. A platform by journalists, for journalists.', 'oj_hero', 'textarea' );
	$add( 'oj_hero_btn1_label', __( 'Button 1 — label', 'onlinejourno' ), 'Open the app', 'oj_hero' );
	$add( 'oj_hero_btn1_url', __( 'Button 1 — link', 'onlinejourno' ), 'https://app.onlinejourno.com/', 'oj_hero', 'url' );
	$add( 'oj_hero_btn2_label', __( 'Button 2 — label', 'onlinejourno' ), 'See a live demo', 'oj_hero' );
	$add( 'oj_hero_btn2_url', __( 'Button 2 — link', 'onlinejourno' ), 'https://app.onlinejourno.com/en/showcase', 'oj_hero', 'url' );

	// ── Feature cards ─────────────────────────────────────────────────────────
	$wp_customize->add_section( 'oj_features', array( 'title' => __( 'Feature cards', 'onlinejourno' ), 'panel' => $panel ) );
	$features = array(
		array( 'Source monitoring', "Watch the outlets, wires and signals that matter to your beats — and see what's moving now." ),
		array( 'Framing analysis', 'See how a story is being told — the PEJ frame families — not just the topic.' ),
		array( 'Briefs & calendar', "Signals become a planning spine: what's ahead, what's at risk, what's ready to file." ),
		array( 'Where you stand', 'Market-aware, competitor-relative context on how your coverage compares on a topic.' ),
	);
	foreach ( $features as $i => $f ) {
		$n = $i + 1;
		$add( "oj_feat{$n}_title", sprintf( __( 'Card %d — title', 'onlinejourno' ), $n ), $f[0], 'oj_features' );
		$add( "oj_feat{$n}_text", sprintf( __( 'Card %d — text', 'onlinejourno' ), $n ), $f[1], 'oj_features', 'textarea' );
	}

	// ── Ethic line ──────────────────────────────────────────────────────────
	$wp_customize->add_section( 'oj_ethic', array( 'title' => __( 'Ethic line', 'onlinejourno' ), 'panel' => $panel ) );
	$add( 'oj_ethic_label', __( 'Label', 'onlinejourno' ), 'The ethic', 'oj_ethic' );
	$add( 'oj_ethic_statement', __( 'Statement', 'onlinejourno' ), 'The machine surfaces. The journalist decides. It never publishes.', 'oj_ethic', 'textarea' );
}
add_action( 'customize_register', 'onlinejourno_customize_register' );
