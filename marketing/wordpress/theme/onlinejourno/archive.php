<?php
/**
 * Archive (category, tag, author, date).
 *
 * @package OnlineJourno
 */
get_header(); ?>

<main class="container" id="primary">

	<div class="page-head">
		<div class="kicker">OnlineJourno · <?php echo is_tag() ? 'Tag' : ( is_category() ? 'Beat' : 'Archive' ); ?></div>
		<h1><?php echo wp_kses_post( get_the_archive_title() ); ?></h1>
		<?php $desc = get_the_archive_description(); if ( $desc ) : ?>
			<div class="dek"><?php echo wp_kses_post( $desc ); ?></div>
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
			<?php echo paginate_links( array( 'prev_text' => '← Newer', 'next_text' => 'Older →' ) ); ?>
		</nav>
	<?php else : ?>
		<p>Nothing filed here yet.</p>
	<?php endif; ?>

</main>

<?php get_footer(); ?>
