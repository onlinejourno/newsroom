<?php
/**
 * Footer.
 *
 * @package OnlineJourno
 */
?>
</div><!-- .site-content -->

<footer class="site-footer">
	<div class="container">
		<div>
			<span class="word" style="font-family:var(--font-display);font-weight:400;">OnlineJourno<span style="color:#c0392b">.</span></span>
			<p style="color:rgba(247,244,237,.6);max-width:34ch;margin-top:14px;font:400 14px/1.5 var(--font-sans);">The editorial-intelligence platform for newsrooms. A platform by journalists, for journalists. The machine surfaces; the journalist decides; it never publishes.</p>
		</div>
		<div>
			<h4>Product</h4>
			<a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">About</a>
			<a href="https://app.onlinejourno.com/">Open the app</a>
			<a href="https://app.onlinejourno.com/en/showcase">Live demo</a>
		</div>
		<div>
			<h4>Legal</h4>
			<a href="<?php echo esc_url( home_url( '/privacy-policy/' ) ); ?>">Privacy Policy</a>
			<a href="<?php echo esc_url( home_url( '/license-attribution/' ) ); ?>">License &amp; Attribution</a>
			<a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Contact</a>
		</div>
	</div>
	<div class="footer-base">
		<div class="container">
			<span>&copy; <?php echo esc_html( date( 'Y' ) ); ?> OnlineJourno &middot; A platform by journalists, for journalists.</span>
			<span>Content licensed <a href="<?php echo esc_url( home_url( '/license-attribution/' ) ); ?>" style="color:inherit;text-decoration:underline;">CC&nbsp;BY&nbsp;4.0</a></span>
		</div>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
