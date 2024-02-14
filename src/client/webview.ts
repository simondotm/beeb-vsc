import { join } from 'path';
import { ExtensionContext, Uri, ViewColumn, commands, window } from 'vscode';



function getNonce(): string {
	let text = '';
	const possible =
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(
			Math.floor(Math.random() * possible.length)
		);
	}
	return text;
}

export function createWebView(context: ExtensionContext) {

	context.subscriptions.push(
		commands.registerCommand('emulator.start', () => {
			// Create and show a new webview
			const panel = window.createWebviewPanel(
				'emulator', // Identifies the type of the webview. Used internally
				'JSBeeb', // Title of the panel displayed to the user
				ViewColumn.One, // Editor column to show the new webview panel in.
				{
					enableScripts: true,					
					// Only allow the webview to access resources in our extension's media directory
					localResourceRoots: [
						Uri.file(join(context.extensionPath, 'assets', 'jsbeeb')),
						Uri.file(join(context.extensionPath, 'assets', 'jsbeeb', 'images')),
						Uri.file(join(context.extensionPath, 'assets', 'jsbeeb', 'roms')),
						Uri.file(join(context.extensionPath, 'assets', 'jsbeeb', 'sounds')),
						Uri.file(join(context.extensionPath, 'assets', 'jsbeeb', 'discs')),
					]

				} // Webview options. More on these later.
			);




			function getResource(context: ExtensionContext, fileName: string, subDirectory1: string = '', subDirectory2: string = '') {
				const uri = Uri.file(join(context.extensionPath, 'assets', 'jsbeeb', subDirectory1, subDirectory2, fileName));
				//return .with({ scheme: 'vscode-resource' });
				return panel.webview.asWebviewUri(uri);
			}
			function getWebviewContent2(context: ExtensionContext) {
				const r = {
					// mainJs: getResource(context, 'main.b873c5e3c43e916fb760.js'),
					mainJs: getResource(context, 'main.js'),
					mainCss: getResource(context, 'main.975a7015161cb586cc28.css'),
					imagesCubMonitorPng: getResource(context, 'cub-monitor.png', 'images'),
					imagesPlaceholderPng: getResource(context, 'placeholder.png', 'images'),
					osRom: getResource(context, 'os.rom', 'roms'),
				};
				return `
			<!doctype html>
			<html lang="en">
				<head>
					<meta charset="utf-8" />
					<meta http-equiv="X-UA-Compatible" content="IE=edge" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<meta name="author" content="Matt Godbolt" />
					<meta name="description" content="A Javascript BBC Micro emulator" />
					<!--
					<meta
						http-equiv="Content-Security-Policy"
						content="script-src 'self' 'unsafe-inline' 'unsafe-eval' *.google-analytics.com *.google.com;"
					/>
					-->
					<title>jsbeeb - Javascript BBC Micro emulator</title>
					<script nonce="${getNonce()}" defer="defer" type='text/javascript'>
						window.JSBEEB_RESOURCES={
							"roms/os.rom": "${getResource(context, 'os.rom', 'roms')}",
							"roms/BASIC.ROM": "${getResource(context, 'BASIC.ROM', 'roms')}",
							"roms/b/DFS-1.2.rom": "${getResource(context, 'DFS-1.2.rom', 'roms', 'b')}",
							"sounds/disc525/motoron.wav": "${getResource(context, 'motoron.wav', 'sounds', 'disc525')}",
							"sounds/disc525/motoroff.wav": "${getResource(context, 'motoroff.wav', 'sounds', 'disc525')}",
							"sounds/disc525/motor.wav": "${getResource(context, 'motor.wav', 'sounds', 'disc525')}",
							"sounds/disc525/step.wav": "${getResource(context, 'step.wav', 'sounds', 'disc525')}",
							"sounds/disc525/seek.wav": "${getResource(context, 'seek.wav', 'sounds', 'disc525')}",
							"sounds/disc525/seek2.wav": "${getResource(context, 'seek2.wav', 'sounds', 'disc525')}",
							"sounds/disc525/seek3.wav": "${getResource(context, 'seek3.wav', 'sounds', 'disc525')}",
							"discs/elite.ssd": "${getResource(context, 'elite.ssd', 'discs')}",
						};
						console.log("Window JSBEEB_RESOURCES Config=" + window.JSBEEB_RESOURCES);
					</script>
					<script nonce="${getNonce()}" defer="defer" src="${r.mainJs}"></script>
					<link href="${r.mainCss}" rel="stylesheet">    
				</head>

				<body>
					<nav id="header-bar" class="navbar navbar-dark bg-dark navbar-expand-lg not-electron" role="navigation">
						<div class="container-fluid">
							<a class="navbar-brand" href="https://bbc.godbolt.org/" target="_top">jsbeeb</a>
							<button
								class="navbar-toggler"
								type="button"
								data-bs-toggle="collapse"
								data-bs-target="#navbarSupportedContent"
								aria-controls="navbarSupportedContent"
								aria-expanded="false"
								aria-label="Toggle  },
								navigation"
							>
								<span class="navbar-toggler-icon"></span>
							</button>
							<div class="collapse navbar-collapse" id="navbarSupportedContent">
								<ul class="navbar-nav nav mb-2 mb-lg-0">
									<li class="nav-item">
										<a href="#configuration" class="nav-link" data-bs-toggle="modal" data-bs-target="#configuration">
											<span class="bbc-model">BBC B</span></a
										>
									</li>
									<li class="nav-item dropdown embed-hide">
										<a
											href="#"
											class="nav-link dropdown-toggle"
											id="navbarDiscs"
											role="button"
											data-bs-toggle="dropdown"
											aria-expanded="false"
											>Discs</a
										>
										<ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDiscs">
											<li>
												<a href="#sth" class="dropdown-item sth" data-id="discs" data-bs-toggle="modal" data-bs-target="#sth"
													>From STH archive</a
												>
											</li>
											<li>
												<a href="#discs" class="dropdown-item" data-bs-toggle="modal" data-bs-target="#discs">
													From examples or local</a
												>
											</li>
											<li class="if-drive-available">
												<a href="#google-drive" class="dropdown-item" id="open-drive-link">From Google Drive</a>
											</li>
											<hr />
											<div id="fsmenuitem">
												<li>
													<a href="#econetfs" class="dropdown-item" data-bs-toggle="modal" data-bs-target="#econetfs">
														Econet File Server</a
													>
												</li>
												<hr />
											</div>
											<li>
												<a href="#download-drive" class="dropdown-item" id="download-drive-link">Download drive 0 image</a>
											</li>
										</ul>
									</li>
									<li class="nav-item dropdown embed-hide">
										<a
											href="#"
											class="nav-link dropdown-toggle"
											id="navbarCassettes"
											role="button"
											data-bs-toggle="dropdown"
											aria-expanded="false"
											>Cassettes</a
										>
										<ul class="dropdown-menu dropdown-menu-dark" id="tape-menu" aria-labelledby="navbarCassettes">
											<li>
												<a href="#sth" class="dropdown-item sth" data-bs-toggle="modal" data-id="tapes" data-bs-target="#sth"
													>From STH archive</a
												>
											</li>
											<li><a data-id="rewind" class="dropdown-item">Rewind cassette</a></li>
											<li>
												<a href="#discs" class="dropdown-item" data-bs-toggle="modal" data-bs-target="#tapes">
													From local file
												</a>
											</li>
										</ul>
									</li>
									<li class="nav-item dropdown embed-hide">
										<a
											href="#"
											class="nav-link dropdown-toggle"
											id="navbarReset"
											role="button"
											data-bs-toggle="dropdown"
											aria-expanded="false"
											>Reset</a
										>
										<ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarReset">
											<li><a href="#" id="soft-reset" class="dropdown-item">Soft reset</a></li>
											<li><a href="#" id="hard-reset" class="dropdown-item">Hard reset</a></li>
										</ul>
									</li>
									<li class="nav-item dropdown embed-hide">
										<a
											href="#"
											class="nav-link dropdown-toggle"
											id="navbarMore"
											role="button"
											data-bs-toggle="dropdown"
											aria-expanded="false"
											>More</a
										>
										<ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarMore">
											<li><a href="#" id="fs" class="dropdown-item">Fullscreen</a></li>
											<li><a href="#help" class="dropdown-item" data-bs-toggle="modal" data-bs-target="#help">Help</a></li>
											<li><a href="mailto:matt@godbolt.org" class="dropdown-item">Contact the Author</a></li>
											<li>
												<a href="http://xania.org/MattGodbolt" class="dropdown-item" rel="author" target="_blank">
													About the Author</a
												>
											</li>
											<li>
												<a href="#about" class="dropdown-item" data-bs-toggle="modal" data-bs-target="#info" id="about">
													About jsbeeb</a
												>
											</li>
										</ul>
									</li>
								</ul>
								<span class="navbar-text m-auto">
									Edit BBC BASIC interactively with Owlet at
									<a href="https://bbcmic.ro/" target="_blank">bbcmic.ro</a>!
								</span>
								<form class="d-flex">
									<input
										id="paste-text"
										class="form-control me-2"
										type="text"
										maxlength="0"
										placeholder="Paste text or drop files here..."
										aria-label="Search"
									/>
								</form>
							</div>
						</div>
					</nav>

					<div id="audio-warning" class="alert alert-warning initially-hidden">
						Your browser has suspended audio -- mouse click or key press for sound.
					</div>

					<div>
						<div id="outer">
							<div id="cub-monitor">
								<img
									id="cub-monitor-pic"
									width="896"
									height="648"
									src="${r.imagesCubMonitorPng}"
									alt="A fake CUB computer monitor"
								/>
								<div class="sidebar left"><img src="${r.imagesPlaceholderPng}" alt="" /></div>
								<canvas id="screen" width="896" height="600"></canvas>
								<div class="sidebar right"><img src="${r.imagesPlaceholderPng}" alt="" /></div>
								<div class="sidebar bottom"><img src="${r.imagesPlaceholderPng}" alt="" /></div>
							</div>
						</div>
						<div id="leds">
							<table>
								<thead>
									<tr>
										<th>cassette<br />motor</th>
										<th>caps<br />lock</th>
										<th>shift<br />lock</th>
										<th>drive<br />0/2</th>
										<th>drive<br />1/3</th>
										<th>econet<br />tx/rx</th>
										<th id="virtual-mhz-header">virtual<br />MHz</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td>
											<div class="red led" id="motorlight"></div>
										</td>
										<td>
											<div class="red led" id="capslight"></div>
										</td>
										<td>
											<div class="red led" id="shiftlight"></div>
										</td>
										<td>
											<div class="yellow led" id="drive0"></div>
										</td>
										<td>
											<div class="yellow led" id="drive1"></div>
										</td>
										<td>
											<div class="yellow led" id="networklight"></div>
										</td>
										<td>
											<div class="virtualMHz"></div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div id="crtc_debug" class="initially-hidden">
							<div class="crtc_state">
								<h6 class="dbg">6845 state</h6>
								<table>
									<tbody>
										<tr class="template">
											<th><span class="register"></span>:</th>
											<td class="value"></td>
										</tr>
									</tbody>
								</table>
							</div>
							<div class="crtc_regs">
								<h6 class="dbg">6845 regs</h6>
								<table>
									<tbody>
										<tr class="template">
											<th><span class="register"></span>:</th>
											<td class="value"></td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
						<div id="debug" class="initially-hidden">
							<div class="debug-container">
								<form id="goto-mem-addr-form" role="form">
									<div class="input-group input-group-sm">
										<span accesskey="m" class="input-group-text" id="mem_addr_text">
											<span class="accesskey">M</span>em addr:
										</span>
										<input
											type="text"
											class="form-control form-control-sm goto-addr"
											placeholder="$0000"
											aria-label="Memory address"
											aria-describedby="mem_addr_text"
										/>
									</div>
								</form>
								<div id="memory">
									<div class="template">
										<span class="dis_addr">0000</span
										><span class="mem_bytes"
											><span>11</span> <span>22</span> <span>33</span> <span>44</span> <span>55</span> <span>66</span>
											<span>77</span> <span>88</span></span
										><span class="mem_asc"
											><span>A</span><span>A</span><span>A</span><span>A</span><span>A</span><span>A</span><span>A</span
											><span>A</span></span
										>
									</div>
								</div>
							</div>
							<div class="debug-container">
								<form role="form" id="goto-dis-addr-form">
									<div class="input-group input-group-sm">
										<span accesskey="a" class="input-group-text" id="dis_addr_text"
											><span class="accesskey">A</span>ddr:</span
										>
										<input
											type="text"
											class="form-control form-control-sm goto-addr"
											placeholder="$0000"
											aria-label="Disassembly address"
											aria-describedby="dis_addr_text"
										/>
									</div>
								</form>
								<div id="disassembly">
									<div class="template dis_elem">
										<span class="bp_gutter"></span><span class="dis_addr">0000</span><span class="instr_bytes">11 22 33</span
										><span class="instr_asc">ABC</span><span class="disassembly">LDA (&amp;70), X</span>
									</div>
								</div>
							</div>
							<div id="registers">
								<div>
									<span class="flag" id="cpu6502_flag_c">C</span><span class="flag" id="cpu6502_flag_z">Z</span
									><span class="flag" id="cpu6502_flag_i">I</span><span class="flag" id="cpu6502_flag_d">D</span
									><span class="flag" id="cpu6502_flag_v">V</span><span class="flag" id="cpu6502_flag_n">N</span>
								</div>
								<div><span class="register">A</span>: <span id="cpu6502_a">00</span></div>
								<div><span class="register">X</span>: <span id="cpu6502_x">00</span></div>
								<div><span class="register">Y</span>: <span id="cpu6502_y">00</span></div>
								<div><span class="register">S</span>: <span id="cpu6502_s">00</span></div>
								<div><span class="register">PC</span>: <span id="cpu6502_pc">0000</span></div>
							</div>
						</div>
						<div id="hardware_debug" class="initially-hidden">
							<div class="via_regs" id="sysvia">
								<h6 class="dbg">System VIA</h6>
								<table>
									<tbody>
										<tr class="template">
											<th><span class="register"></span>:</th>
											<td class="value"></td>
										</tr>
									</tbody>
								</table>
							</div>
							<div class="via_regs" id="uservia">
								<h6 class="dbg">User VIA</h6>
								<table>
									<tbody>
										<tr class="template">
											<th><span class="register"></span>:</th>
											<td class="value"></td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>

					<div class="modal fade" id="info" tabindex="-1" aria-labelledby="infoModalLabel" aria-hidden="true">
						<div class="modal-dialog modal-lg">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="infoModalLabel">About jsbeeb</h5>
									<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
								</div>
								<div class="modal-body">
									<div>
										By <a href="https://xania.org/">Matt Godbolt</a>. Based on Sarah Walker's
										<a href="http://b-em.bbcmicro.com/">b-em</a> emulator. Huge thanks to her for open sourcing her code. Big
										thanks too to Richard Talbot-Watkins for his help and support. The disc loaded up by default is the
										amazing Elite (thanks to <a href="http://www.iancgbell.clara.net/elite/bbc/">Ian Bell</a> for making it
										available).
									</div>
									<div>
										Source is on <a href="https://github.com/mattgodbolt/jsbeeb">GitHub</a>. Works best in Chrome or Firefox.
									</div>
									<div>
										Cycle-accurate emulation greatly helped by the fantastic
										<a href="http://www.visual6502.org/">Visual 6502</a> Project. Consider donating to them if you enjoy this
										stuff as much as I do!
									</div>
									<div>
										I f you're looking for more information on the BBC or to find like-minded people to chat about the
										hardware or software, check out the <a href="http://www.stardot.org.uk/forums/">StarDot forums</a>.
									</div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
								</div>
							</div>
						</div>
					</div>

					<div class="modal fade" id="help" tabindex="-1" aria-labelledby="helpModalLabel" aria-hidden="true">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="helpModalLabel">Help</h5>
									<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
								</div>
								<div class="modal-body">
									<div>
										This is an emulator for the <a href="https://en.wikipedia.org/wiki/Bbc_micro">BBC Micro</a>
										Model B, a popular home computer in the UK in the 1980s.
									</div>
									<div>
										The default disc image is Elite - a pioneering 3D space trading game. To boot discs on the BBC, one would
										press <span class="key">SHIFT</span> and <span class="key">BREAK</span>. The keyboard of the BBC is
										slightly different from a modern PC, notably in the placement of the symbol characters. Also, the current
										keyboard layout is optimized for a US keyboard; I am working on improving this situation.
									</div>
									<div>
										<h5>Handy key mappings</h5>
										<table class="keymap">
											<tr>
												<th>BBC</th>
												<th>PC</th>
												<th>OSX</th>
											</tr>
											<tr>
												<td><span class="function key">F0</span></td>
												<td><span class="key">F10</span></td>
												<td><span class="key">F10</span></td>
											</tr>
											<tr>
												<td><span class="key">BREAK</span></td>
												<td><span class="key">F12</span></td>
												<td><span class="key">Right &#8984;</span> + <span class="key">F12</span></td>
											</tr>
											<tr>
												<td><span class="key">COPY</span></td>
												<td><span class="key">End</span></td>
												<td><span class="key">Right &#8984;</span> + <span class="key">F11</span></td>
											</tr>
											<tr>
												<td>
													<div class="dbl key">*<br />:</div>
												</td>
												<td>TODO</td>
												<td>TODO</td>
											</tr>
											<tr>
												<td>Debug</td>
												<td><span class="key">Ctrl-Home</span></td>
												<td>TODO</td>
											</tr>
										</table>
									</div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
								</div>
							</div>
						</div>
					</div>

					<div class="modal fade" id="discs" tabindex="-1" aria-labelledby="discModalLabel" aria-hidden="true">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="discModalLabel">Load disc image</h5>
									<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
								</div>
								<div class="modal-body">
									<ul id="disc-list">
										<li class="template">
											<a href="#"><span class="name"></span></a> - <span class="description"></span>
										</li>
									</ul>
									To load a custom disc image, get an SSD, DSD, ADF, ADM or ADL file and load it below. Search the web, or
									check somewhere like
									<a href="http://www.bbcmicrogames.com/GettingStarted.html">here</a> for these. Be aware the images are
									usually stored in a ZIP file, and you'll need to unzip first.
									<div class="disc">
										<label
											>Load local SSD, DSD, ADF, ADM or ADL file:
											<input type="file" id="disc_load" accept=".ssd,.dsd,.adf,.adm,.adl,application/binary" />
										</label>
									</div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
								</div>
							</div>
						</div>
					</div>

					<div class="modal fade" id="econetfs" tabindex="-1" aria-labelledby="discModalLabel" aria-hidden="true">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="discModalLabel">Econet File Server</h5>
									<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
								</div>
								<div class="modal-body">
									<label>
										Download server drive image (10mb scsi.dat):<br />

										<button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="download-filestore-link">
											Download image
										</button>
									</label>

									<div class="disc">
										<label
											>Upload a local drive image and restart the file server:
											<input class="form-control" type="file" id="fs_load" accept=".dat,application/binary" />
										</label>
									</div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
								</div>
							</div>
						</div>
					</div>

					<div class="modal fade" id="tapes" tabindex="-1" aria-labelledby="tapeModalLabel" aria-hidden="true">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="tapeModalLabel">Load cassette image</h5>
									<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
								</div>
								<div class="modal-body">
									To load a custom cassette image, get a UEF file and load it below.
									<div class="tape">
										<label
											>Load local UEF file:
											<input type="file" id="tape_load" accept=".uef,application/binary" />
										</label>
									</div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
								</div>
							</div>
						</div>
					</div>

					<div class="modal fade" id="google-drive" tabindex="-1" aria-labelledby="google-driveModalLabel" aria-hidden="true">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="google-driveModalLabel">
										Load or create disc from your
										<a href="https://drive.google.com/">Google Drive</a>
										account
									</h5>
									<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
								</div>
								<div class="modal-body">
									<div class="loading">Loading...</div>
									<div>
										<ul class="list">
											<li class="template">
												<a href="#"><span class="name"></span></a>
											</li>
										</ul>
										<div>
											<form class="well" role="form" action="#">
												<input type="text" placeholder="Create disc..." autofocus class="disc-name" />
												<button type="submit" class="btn btn-secondary create-button">Create</button>
											</form>
										</div>
									</div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn" data-bs-dismiss="modal">Close</button>
								</div>
							</div>
						</div>
					</div>

					<!-- cannot make this one fade in else our attempts to close the modal while it's still opening fail -->
					<div class="modal" id="loading-dialog" tabindex="-1" aria-labelledby="loadingModalLabel" aria-hidden="true">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-body">
									<div class="modal-header">
										<h5 class="modal-title loading" id="loadingModalLabel"></h5>
										<button
											type="button"
											class="btn-close btn-close-white"
											data-bs-dismiss="modal"
											aria-label="Close"
										></button>
									</div>
								</div>
								<div class="modal-body">
									<div style="display: none" id="google-drive-auth">
										Google Drive requires you to authorize jsbeeb to access your files by logging in.<br />
										Please click Authorize to open a Google Drive pop-up to authenticate and give permission to jsbeeb.
										<form class="well" role="form" action="#">
											<button type="submit" class="btn btn-secondary create-button">Authorize</button>
										</form>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="modal fade" id="sth" tabindex="-1" aria-labelledby="sthModalLabel" aria-hidden="true">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="sthModalLabel">
										Load from
										<a href="http://www.stairwaytohell.com/">Stairway to Hell</a>
										archive
									</h5>
									<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
								</div>
								<div class="modal-body">
									<div style="margin-bottom: 1rem">
										<div class="loading">Loading catalog from STH archive...</div>
										<div class="filter">
											<label>Filter <input type="text" autofocus id="sth-filter" /></label>
										</div>
									</div>
									<ul id="sth-list">
										<li class="template">
											<a href="#"><span class="name"></span></a>
										</li>
									</ul>
								</div>
								<div class="modal-footer">
									<label class="float-xs-left checkbox-inline">
										<input type="checkbox" class="autoboot" value="" />Autoboot</label
									>
									<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
								</div>
							</div>
						</div>
					</div>

					<div class="modal fade" id="error-dialog" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="errorModalLabel">An error occurred - sorry!</h5>
								</div>
								<div class="modal-body">
									<div>While <span class="context"></span>:</div>
									<div class="error"></div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
								</div>
							</div>
						</div>
					</div>

					<div class="modal fade" id="are-you-sure" tabindex="-1" aria-labelledby="aysModalLabel" aria-hidden="true">
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="aysModalLabel">Are You Sure?</h5>
									<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
								</div>
								<div class="modal-body">
									<div class="context"></div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn btn-secondary ays-no" data-bs-dismiss="modal">No</button>
									<button type="button" class="btn btn-primary ays-yes">Yes</button>
								</div>
							</div>
						</div>
					</div>

					<div
						class="modal fade"
						id="configuration"
						tabindex="-1"
						aria-labelledby="configurationModalLabel"
						aria-hidden="true"
					>
						<div class="modal-dialog">
							<div class="modal-content">
								<div class="modal-header">
									<h5 class="modal-title" id="configurationModalLabel">Emulation Configuration</h5>
									<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
								</div>
								<div class="modal-body">
									<div class="row align-items-center">
										<div class="col-sm-6">
											<label for="bbc-model-dropdown" class="col-form-label"
												>Base model:<br />
												<small>(including disk interface)</small>
											</label>
										</div>
										<div class="col-sm-6 dropdown">
											<button
												type="button"
												class="btn btn-secondary dropdown-toggle"
												data-bs-toggle="dropdown"
												id="bbc-model-dropdown"
											>
												<span class="bbc-model"></span>
											</button>
											<ul
												class="dropdown-menu dropdown-menu-dark model-menu"
												role="menu"
												aria-labelledby="bbc-model-dropdown"
											>
												<li>
													<a href="#" class="dropdown-item" data-target="B-DFS1.2">BBC B with 8271 (DFS 1.2)</a>
												</li>
												<li>
													<a href="#" class="dropdown-item" data-target="B-DFS0.9">BBC B with 8271 (DFS 0.9)</a>
												</li>
												<li>
													<a href="#" class="dropdown-item" data-target="B1770">BBC B with 1770 (DFS)</a>
												</li>
												<li>
													<a href="#" class="dropdown-item" data-target="B1770A">BBC B with 1770 (ADFS)</a>
												</li>
												<li>
													<a href="#" class="dropdown-item" data-target="Master">BBC Master 128 (DFS)</a>
												</li>
												<li>
													<a href="#" class="dropdown-item" data-target="MasterADFS">BBC Master 128 (ADFS)</a>
												</li>
												<li>
													<a href="#" class="dropdown-item" data-target="MasterANFS">BBC Master 128 (ANFS)</a>
												</li>
											</ul>
										</div>
									</div>
									<div class="row align-items-center">
										<div class="col-sm-6">
											<label for="keyboardDropdown" class="col-form-label">Keyboard layout:</label>
										</div>
										<div class="col-sm-6 dropdown">
											<button
												type="button"
												class="btn btn-secondary dropdown-toggle"
												data-bs-toggle="dropdown"
												id="keyboardDropdown"
											>
												<span class="keyboard-layout">Physical</span>
											</button>
											<ul
												class="dropdown-menu dropdown-menu-dark keyboard-menu"
												role="menu"
												aria-labelledby="keyboardDropdown"
											>
												<li>
													<a href="#" class="dropdown-item" data-target="physical">Physical: '*' is next to Enter/Return</a>
												</li>
												<li>
													<a href="#" class="dropdown-item" data-target="natural">Natural: '*' is shift-8</a>
												</li>
												<li>
													<a href="#" class="dropdown-item" data-target="gaming">Gaming: handy for games like Zalaga</a>
												</li>
											</ul>
										</div>
									</div>
									<div class="align-items-center">
										<div class="row">
											<div class="col-sm-6">
												<label for="bbc-peripherals" class="col-form-label"
													>Additional peripherals:<br /><small
														>(some combinations may cause compatibility issues)</small
													></label
												>
											</div>
											<div class="col-sm-6">
												<div class="form-check">
													<input class="form-check-input" type="checkbox" id="65c02" name="65c02" />
													<label class="form-check-label" for="65c02">65c02 co-processor</label>
												</div>
												<div class="form-check">
													<input class="form-check-input" type="checkbox" id="hasMusic5000" name="hasMusic5000" />
													<label class="form-check-label" for="hasMusic5000">Music 5000 synthesiser</label>
												</div>
												<div class="form-check">
													<input class="form-check-input" type="checkbox" id="hasTeletextAdaptor" name="hasTeletextAdaptor" />
													<label class="form-check-label" for="hasTeletextAdaptor">Teletext adaptor</label>
												</div>
												<div class="form-check">
													<input class="form-check-input" type="checkbox" id="hasEconet" name="hasEconet" />
													<label class="form-check-label" for="hasEconet">Econet with file server</label>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div class="modal-footer">
									<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
								</div>
							</div>
						</div>
					</div>
				</body>
			</html>

			`;
			}

			// And set its HTML content

			panel.webview.html = getWebviewContent2(context);


		})
	);
}

function getWebviewContent() {
	return `<!DOCTYPE html>
<html lang="en">
<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>JSBeeb</title>
		<script>
			function resizeIframe(obj) {
				obj.style.height = obj.contentWindow.document.documentElement.scrollHeight + 'px';
			}
		</script>					
</head>
<body>
<iframe width="100%" height="1000px" frameborder="0" scrolling="no" onload="resizeIframe(this)" src="https://bbc.godbolt.org/" title="JSBeeb">
</iframe>					
</body>
</html>`;
}
