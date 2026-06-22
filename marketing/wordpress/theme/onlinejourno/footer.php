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
			<p style="color:rgba(247,244,237,.6);max-width:34ch;margin-top:14px;font:400 14px/1.5 var(--font-sans);">Editorial intelligence for newsrooms. Open source &mdash; see it here, get the code on GitHub, run it on your own servers.</p>
		</div>
		<div>
			<h4>Product</h4>
			<a href="<?php echo esc_url( home_url( '/' ) ); ?>">Home</a>
			<a href="https://app.onlinejourno.com/">Platform</a>
			<a href="https://tools.onlinejourno.com/">Tools</a>
			<a href="https://editorial-optimiser.onlinejourno.com/">Editorial Optimiser</a>
		</div>
		<div>
			<h4>Project</h4>
			<a href="https://github.com/onlinejourno" rel="noopener">Source on GitHub</a>
			<a href="<?php echo esc_url( home_url( '/products/' ) ); ?>">Products</a>
			<a href="<?php echo esc_url( home_url( '/docs/' ) ); ?>">Docs &amp; self-host</a>
		</div>
		<div>
			<h4>Legal</h4>
			<a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">About</a>
			<a href="<?php echo esc_url( home_url( '/privacy-policy/' ) ); ?>">Privacy Policy</a>
			<a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Contact</a>
			<a href="<?php echo esc_url( home_url( '/license-attribution/' ) ); ?>">License &amp; Attribution</a>
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
