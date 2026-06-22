<?php
/**
 * A single story in the stream (card).
 *
 * @package OnlineJourno
 */
?>
<article <?php post_class( 'post-card' ); ?> id="post-<?php the_ID(); ?>">
	<div class="meta"><?php echo esc_html( onlinejourno_kicker() ); ?> · <?php echo esc_html( get_the_date() ); ?></div>

	<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>

	<?php if ( has_excerpt() || get_the_content() ) : ?>
		<p class="excerpt"><?php echo esc_html( wp_trim_words( get_the_excerpt(), 34, '…' ) ); ?></p>
	<?php endif; ?>

	<div class="tags">
		<span class="tag need">Know · the facts</span>
		<span class="tag kind">Straight News</span>
		<?php
		$tags = get_the_tags();
		if ( $tags ) {
			foreach ( array_slice( $tags, 0, 3 ) as $tag ) {
				echo '<a class="tag" href="' . esc_url( get_tag_link( $tag->term_id ) ) . '">' . esc_html( $tag->name ) . '</a>';
			}
		}
		?>
	</div>

	<div class="byline">
		By <?php the_author(); ?> · Fetched <?php echo esc_html( get_the_date( 'j M Y, g:i a' ) ); ?> ·
		<a class="detail" href="<?php the_permalink(); ?>">detail</a>
	</div>
</article>
