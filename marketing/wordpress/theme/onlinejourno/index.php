<?php
/**
 * Main index / blog stream.
 *
 * @package OnlineJourno
 */
get_header(); ?>

<main class="container" id="primary">

	<div class="page-head">
		<?php if ( is_home() && ! is_front_page() ) : ?>
			<div class="kicker">OnlineJourno · Newslist</div>
			<h1><?php single_post_title(); ?></h1>
		<?php else : ?>
			<div class="kicker">OnlineJourno · Today</div>
			<h1>The newslist.</h1>
			<p class="dek">Every story in flight — the state it's in, who's filing it, and the reader need it serves.</p>
		<?php endif; ?>
	</div>
	<hr class="rule">

	<?php if ( have_posts() ) : ?>
		<div class="stream">
			<?php while ( have_posts() ) : the_post(); ?>
				<?php get_template_part( 'template-parts/content', 'card' ); ?>
			<?php endwhile; ?>
		</div>

		<nav class="pagination">
			<?php
			echo paginate_links( array(
				'prev_text' => '← Newer',
				'next_text' => 'Older →',
			) );
			?>
		</nav>
	<?php else : ?>
		<p>No stories yet. <a href="<?php echo esc_url( admin_url( 'post-new.php' ) ); ?>">File the first one.</a></p>
	<?php endif; ?>

</main>

<?php get_footer(); ?>
