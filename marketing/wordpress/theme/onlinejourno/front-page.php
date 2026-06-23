<?php
/**
 * Front page — the marketing homepage. WordPress uses this automatically as the
 * site front page when the theme is active. Clean editorial: hero, the lifecycle
 * as features, the ethic. No motion narrative — desk-ready, per OJDS.
 *
 * @package OnlineJourno
 */

get_header();
?>
<main class="container" id="content">

	<section class="page-head">
		<p class="kicker"><?php echo esc_html( get_theme_mod( 'oj_hero_kicker', 'Editorial intelligence for newsrooms' ) ); ?></p>
		<h1><?php echo esc_html( get_theme_mod( 'oj_hero_title', 'Give every story a fair chance.' ) ); ?></h1>
		<p class="dek"><?php echo esc_html( get_theme_mod( 'oj_hero_dek', 'OnlineJourno monitors your sources, reads how stories are being framed, and delivers desk-ready briefs — so reporters spend their time on judgement, not on watching feeds. A platform by journalists, for journalists.' ) ); ?></p>
		<p style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap;">
			<a class="btn" href="<?php echo esc_url( get_theme_mod( 'oj_hero_btn1_url', 'https://app.onlinejourno.com/' ) ); ?>"><?php echo esc_html( get_theme_mod( 'oj_hero_btn1_label', 'Open the app' ) ); ?></a>
			<a class="btn ghost" href="<?php echo esc_url( get_theme_mod( 'oj_hero_btn2_url', 'https://app.onlinejourno.com/en/showcase' ) ); ?>"><?php echo esc_html( get_theme_mod( 'oj_hero_btn2_label', 'See a live demo' ) ); ?></a>
		</p>
	</section>

	<hr class="rule">

	<section class="home-features">
		<div class="feature">
			<h3><?php echo esc_html( get_theme_mod( 'oj_feat1_title', 'Source monitoring' ) ); ?></h3>
			<p><?php echo esc_html( get_theme_mod( 'oj_feat1_text', "Watch the outlets, wires and signals that matter to your beats — and see what's moving now." ) ); ?></p>
		</div>
		<div class="feature">
			<h3><?php echo esc_html( get_theme_mod( 'oj_feat2_title', 'Framing analysis' ) ); ?></h3>
			<p><?php echo esc_html( get_theme_mod( 'oj_feat2_text', 'See how a story is being told — the PEJ frame families — not just the topic.' ) ); ?></p>
		</div>
		<div class="feature">
			<h3><?php echo esc_html( get_theme_mod( 'oj_feat3_title', 'Briefs & calendar' ) ); ?></h3>
			<p><?php echo esc_html( get_theme_mod( 'oj_feat3_text', "Signals become a planning spine: what's ahead, what's at risk, what's ready to file." ) ); ?></p>
		</div>
		<div class="feature">
			<h3><?php echo esc_html( get_theme_mod( 'oj_feat4_title', 'Where you stand' ) ); ?></h3>
			<p><?php echo esc_html( get_theme_mod( 'oj_feat4_text', 'Market-aware, competitor-relative context on how your coverage compares on a topic.' ) ); ?></p>
		</div>
	</section>

	<hr class="rule" style="margin-top:40px;">
	<p class="kicker">The suite</p>
	<section class="home-features" style="margin-top:18px;">
		<div class="feature">
			<h3><a href="https://app.onlinejourno.com/" style="color:inherit;text-decoration:none;">The Platform &rarr;</a></h3>
			<p>The editorial-intelligence app: sources, framing, briefs, calendar, story scores.</p>
		</div>
		<div class="feature">
			<h3><a href="https://tools.onlinejourno.com/" style="color:inherit;text-decoration:none;">Tools &rarr;</a></h3>
			<p>Free standalone tools &mdash; web bloat checker, crawl-budget analyser, and more.</p>
		</div>
		<div class="feature">
			<h3><a href="https://editorial-optimiser.onlinejourno.com/" style="color:inherit;text-decoration:none;">Editorial Optimiser &rarr;</a></h3>
			<p>Optimise a story for distribution and a fair chance in discovery.</p>
		</div>
	</section>

	<section class="band" style="margin-top:40px;">
		<p class="next"><?php echo esc_html( get_theme_mod( 'oj_ethic_label', 'The ethic' ) ); ?></p>
		<p style="font-family:var(--font-display);font-size:28px;line-height:1.3;margin:0;"><?php echo esc_html( get_theme_mod( 'oj_ethic_statement', 'The machine surfaces. The journalist decides. It never publishes.' ) ); ?></p>
	</section>

	<section style="padding:34px 0;">
		<p class="dek">Open and self-hostable &mdash; run it on your own infrastructure, configure your own sources, own your data. <a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">About OnlineJourno &rarr;</a></p>
	</section>

</main>
<?php
get_footer();
