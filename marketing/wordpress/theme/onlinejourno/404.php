<?php
/**
 * 404.
 *
 * @package OnlineJourno
 */
get_header(); ?>

<main class="container single" id="primary">
	<div class="page-head">
		<div class="kicker" style="color:var(--accent)">Error 404</div>
		<h1>Spiked.</h1>
		<p class="dek">That story isn't on the wire. It may have been moved, renamed, or never filed.</p>
	</div>
	<p><a class="btn" href="<?php echo esc_url( home_url( '/' ) ); ?>">← Back to the newslist</a></p>
</main>

<?php get_footer(); ?>
