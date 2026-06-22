<?php
/**
 * Static page.
 *
 * @package OnlineJourno
 */
get_header(); ?>

<main class="container single" id="primary">
	<?php while ( have_posts() ) : the_post(); ?>
		<div class="page-head" style="padding-bottom:0;">
			<div class="kicker">OnlineJourno</div>
		</div>
		<article <?php post_class(); ?> id="post-<?php the_ID(); ?>">
			<h1 class="entry-title"><?php the_title(); ?></h1>
			<div class="entry-content">
				<?php the_content(); ?>
			</div>
		</article>
	<?php endwhile; ?>
</main>

<?php get_footer(); ?>
