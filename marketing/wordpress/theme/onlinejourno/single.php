<?php
/**
 * Single post.
 *
 * @package OnlineJourno
 */
get_header(); ?>

<main class="container single" id="primary">
	<?php while ( have_posts() ) : the_post(); ?>

		<div class="page-head" style="padding-bottom:0;">
			<div class="kicker"><?php echo esc_html( onlinejourno_kicker() ); ?></div>
		</div>

		<article <?php post_class(); ?> id="post-<?php the_ID(); ?>">
			<h1 class="entry-title"><?php the_title(); ?></h1>

			<div class="entry-byline">
				<span class="avatar"><?php echo esc_html( onlinejourno_initials( get_the_author() ) ); ?></span>
				<span>
					By <strong style="color:var(--text-primary);font-weight:600;"><?php the_author(); ?></strong>
					· <?php echo esc_html( get_the_date( 'j M Y, g:i a' ) ); ?> IST
					· <?php echo esc_html( max( 1, (int) round( str_word_count( wp_strip_all_tags( get_the_content() ) ) / 200 ) ) ); ?> min read
				</span>
			</div>

			<?php if ( has_post_thumbnail() ) : ?>
				<figure style="margin:0 0 28px;">
					<?php the_post_thumbnail( 'large' ); ?>
					<?php $cap = get_the_post_thumbnail_caption(); if ( $cap ) : ?>
						<figcaption><?php echo esc_html( $cap ); ?></figcaption>
					<?php endif; ?>
				</figure>
			<?php endif; ?>

			<div class="entry-content">
				<?php the_content(); ?>
			</div>

			<?php
			$tags = get_the_tags();
			if ( $tags ) : ?>
				<div class="tags" style="margin-top:32px;padding-top:20px;border-top:1px solid var(--border-subtle);">
					<?php foreach ( $tags as $tag ) {
						echo '<a class="tag" href="' . esc_url( get_tag_link( $tag->term_id ) ) . '">' . esc_html( $tag->name ) . '</a>';
					} ?>
				</div>
			<?php endif; ?>
		</article>

		<?php
		if ( comments_open() || get_comments_number() ) {
			comments_template();
		}
		?>

	<?php endwhile; ?>
</main>

<?php get_footer(); ?>
