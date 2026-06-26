<?php
/**
 * Front page — the OnlineJourno marketing homepage.
 *
 * Frames the umbrella: Journalistic Agentic Task Orchestration (the full phrase
 * leads; "JATO" is in-context shorthand only). Brand sits on OnlineJourno.
 * Hero is Customizer-editable; the body sections are structural. Per OJDS.
 *
 * @package OnlineJourno
 */

get_header();
?>
<main class="container" id="content">

	<section class="page-head">
		<p class="kicker"><?php echo esc_html( get_theme_mod( 'oj_hero_kicker', 'Journalistic Agentic Task Orchestration' ) ); ?></p>
		<h1><?php echo esc_html( get_theme_mod( 'oj_hero_title', 'Bring a journalism task. Get an answer you can act on.' ) ); ?></h1>
		<p class="dek"><?php echo esc_html( get_theme_mod( 'oj_hero_dek', 'OnlineJourno takes a reporter\'s task in plain language, decomposes it, composes a library of AI agents and tools to do the research, and returns a structured, source-linked result — so the intelligence that today pools at the top of the newsroom finally reaches the reporter at the base. By a journalist, for journalists.' ) ); ?></p>
		<p style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap;">
			<a class="btn" href="<?php echo esc_url( get_theme_mod( 'oj_hero_btn1_url', home_url( '/audit/' ) ) ); ?>"><?php echo esc_html( get_theme_mod( 'oj_hero_btn1_label', "Let's work together" ) ); ?></a>
			<a class="btn ghost" href="<?php echo esc_url( get_theme_mod( 'oj_hero_btn2_url', 'https://tools.onlinejourno.com/' ) ); ?>"><?php echo esc_html( get_theme_mod( 'oj_hero_btn2_label', 'Explore the free tools' ) ); ?></a>
		</p>
	</section>

	<hr class="rule">

	<section class="band">
		<p class="next">Two things are happening to journalism at once</p>
		<p class="dek">The commodity floor is collapsing — AI answer engines are disintermediating the fungible fact. And the reporter files into a fog: more public record than any newsroom can monitor, no thread to her own archive, no idea what became of her story. OnlineJourno is the inverse of the threat — when the commodity floor disappears, the durable value is the work a machine cannot make, and the way to produce more of it is to give every reporter the intelligence only the top can see. <strong>This is not AI that writes the article. It is AI that helps the journalist find and serve the story.</strong></p>
	</section>

	<hr class="rule" style="margin-top:40px;">
	<p class="kicker">One library. Take a tool — or orchestrate them all.</p>
	<section class="home-features" style="margin-top:18px;">
		<div class="feature">
			<h3><a href="<?php echo esc_url( home_url( '/newsroom/' ) ); ?>" style="color:inherit;text-decoration:none;">OnlineJourno Newsroom &rarr;</a></h3>
			<p>The agentic newsroom: watch the public record &rarr; contextualise against your archive &rarr; ranked beat briefs; pre-publish fair-chance cue &rarr; post-publish diagnostic. <em>Fair-source (FSL).</em></p>
		</div>
		<div class="feature">
			<h3><a href="<?php echo esc_url( home_url( '/audit/' ) ); ?>" style="color:inherit;text-decoration:none;">The Audit &rarr;</a></h3>
			<p>The first task of JATO: <em>"assess an outlet, and tell me where its stories are dying."</em> A merit-led diagnostic and a graded report, delivered as a consulting engagement. <em>Consulting.</em></p>
		</div>
		<div class="feature">
			<h3><a href="<?php echo esc_url( home_url( '/daybook/' ) ); ?>" style="color:inherit;text-decoration:none;">Daybook &rarr;</a></h3>
			<p>The predictive editorial calendar — see the story coming while there's still time to report it. <em>Fair-source (FSL).</em></p>
		</div>
		<div class="feature">
			<h3><a href="<?php echo esc_url( home_url( '/galley/' ) ); ?>" style="color:inherit;text-decoration:none;">Galley &rarr;</a></h3>
			<p>A graded report for a single story — where it's strong, where it's losing readers, and the fix. <em>Fair-source (FSL).</em></p>
		</div>
		<div class="feature">
			<h3><a href="https://tools.onlinejourno.com/" style="color:inherit;text-decoration:none;">Free tools &rarr;</a></h3>
			<p>A page-bloat + surveillance-tracker auditor and a crawl-budget analyser — how search and AI crawlers see a publication. <em>Open source (MIT) — free, live now.</em></p>
		</div>
		<div class="feature">
			<h3><a href="<?php echo esc_url( home_url( '/toolkit/' ) ); ?>" style="color:inherit;text-decoration:none;">The Toolkit &rarr;</a></h3>
			<p>145+ open-source tools for the agentic newsroom, mapped by skill — the landscape JATO orchestrates. <em>Free resource.</em></p>
		</div>
	</section>

	<hr class="rule" style="margin-top:40px;">
	<p class="kicker">How it's built</p>
	<section class="home-features" style="margin-top:18px;">
		<div class="feature"><h3>Decision-support, not autopilot</h3><p>It surfaces the signal and the fix, with the reasoning. You decide. It never writes the story or touches the publish button.</p></div>
		<div class="feature"><h3>AI never invents a source</h3><p>Every claim is linked to where it came from.</p></div>
		<div class="feature"><h3>The reader is the subject</h3><p>The fair-chance logic asks whether a story reached the people it was <em>for</em> — including those the market cannot see.</p></div>
		<div class="feature"><h3>Vendor-neutral &amp; fair-source</h3><p>Source-available and self-hostable, converting to fully open over two years. Two of the tools are already fully open source (MIT).</p></div>
	</section>

	<section class="band" style="margin-top:40px;">
		<p class="next"><?php echo esc_html( get_theme_mod( 'oj_ethic_label', 'The ethic' ) ); ?></p>
		<p style="font-family:var(--font-display);font-size:28px;line-height:1.3;margin:0;"><?php echo esc_html( get_theme_mod( 'oj_ethic_statement', 'The machine surfaces. The journalist decides. It never publishes.' ) ); ?></p>
	</section>

	<section style="padding:34px 0;">
		<p class="dek">Built by a journalist who writes code — more than 25 years in digital newsrooms, OnlineJournalism.in since 2000. Vendor-neutral, fair-source, reporter-first. <a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">About OnlineJourno &rarr;</a></p>
	</section>

</main>
<?php
get_footer();
