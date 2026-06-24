<?php
/**
 * Search results.
 *
 * @package OnlineJourno
 */
get_header(); ?>

<main class="container" id="primary">
	<div class="page-head">
		<div class="kicker">OnlineJourno · Search</div>
		<h1><?php printf( esc_html__( 'Results for “%s”', 'onlinejourno' ), esc_html( get_search_query() ) ); ?></h1>
	</div>
	<hr class="rule">

	<?php if ( have_posts() ) : ?>
		<div class="stream">
			<?php while ( have_posts() ) : the_post(); ?>
				<?php get_template_part( 'template-parts/content', 'card' ); ?>
			<?php endwhile; ?>
		</div>
		<nav class="pagination">
			<?php echo paginate_links( array( 'prev_text' => '← Newer', 'next_text' => 'Older →' ) ); ?>
		</nav>
	<?php else : ?>
		<p>No signals matched. Try a different query.</p>
		<?php get_search_form(); ?>
	<?php endif; ?>
</main>

<?php get_footer(); ?>
