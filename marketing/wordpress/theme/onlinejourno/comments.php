<?php
/**
 * Comments.
 *
 * @package OnlineJourno
 */
if ( post_password_required() ) { return; }
?>
<section class="comments" style="max-width:66ch;margin:8px 0 40px;">
	<?php if ( have_comments() ) : ?>
		<h2 style="font:600 22px/1.2 var(--font-serif);margin:0 0 18px;">
			<?php echo esc_html( get_comments_number() ); ?> <?php echo ( 1 === get_comments_number() ) ? 'response' : 'responses'; ?>
		</h2>
		<ol style="list-style:none;padding:0;margin:0;">
			<?php
			wp_list_comments( array(
				'style'       => 'ol',
				'avatar_size' => 36,
				'short_ping'  => true,
			) );
			?>
		</ol>
		<?php the_comments_pagination(); ?>
	<?php endif; ?>

	<?php
	comment_form( array(
		'title_reply'        => 'Add a note',
		'class_submit'       => 'btn green',
		'title_reply_before' => '<h2 style="font:600 22px/1.2 var(--font-serif);margin:24px 0 14px;">',
		'title_reply_after'  => '</h2>',
	) );
	?>
</section>
