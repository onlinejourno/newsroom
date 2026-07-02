<?php
/**
 * Template Name: Wide (full-width, no frame)
 *
 * Full-width reference pages (e.g. the toolkit): no page-head "OnlineJourno"
 * eyebrow, no boxed frame, wide container, horizontally-scrollable tables on
 * mobile. Assign via Page Attributes → Template. The masthead (header.php) is
 * the only branding.
 *
 * @package OnlineJourno
 */
get_header(); ?>

<main class="container wide-page" id="primary">
	<?php while ( have_posts() ) : the_post(); ?>
		<article <?php post_class(); ?> id="post-<?php the_ID(); ?>">
			<h1 class="entry-title"><?php the_title(); ?></h1>
			<div class="entry-content wide-content">
				<?php the_content(); ?>
			</div>
		</article>
	<?php endwhile; ?>
</main>

<?php get_footer(); ?>
