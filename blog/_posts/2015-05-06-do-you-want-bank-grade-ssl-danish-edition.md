---
layout: post
title: Do you really want "bank grade" security in your SSL? Danish edition
comments: true
---

I recently saw an article on [/r/programming](https://www.reddit.com/r/programming) called [Do you really want "bank grade" security in your SSL? Here's how Aussie banks fare](https://www.troyhunt.com/do-you-really-want-bank-grade-security). The author used the [Qualys SSL Labs test](https://www.ssllabs.com/ssltest/) to determine how good Aussie banks' SSL implementations really are. I thought the article was great, and gave good, actionable feedback. At the time of writing this two of the banks listed have already improved their SSL scores.

It got me thinking: how well (or badly) do banks in Denmark fare? We put our trust - and our money - in these banks, but do they really deserve it? The banks I'll be testing come from the [list of systemically important banks](https://en.wikipedia.org/wiki/List_of_systemically_important_banks), more commonly known as "Too big to fail." The list consists of:
 
* Danske Bank
* Nykredit
* Nordea
* Jyske Bank
* Sydbank
* DLR Kredit

The Qualys SSL Labs test gives an overall grade, from A to F, but also points out any pressing issues with the SSL configuration. To score well a site must:
 
* Disable SSL 3 protocol support as it is obselete and insecure
* Support TLS 1.2 as it is the current best protocol
* Have no SHA1 certificates (excluding the root certificate) in the chain as modern browsers will show the site as insecure
* Disable the RC4 cipher as it is a weak cipher
* Support forward secrecy to prevent a compromise of a secure key affecting the confidentiality of past conversations
* Mitigate POODLE attacks, to prevent attackers downgrading secure connections to insecure connections

To make this as realistic as possible, I'll be testing the login pages.

So I've got my list of sites, and my test all sorted. Let's dive right in!

<table>
  <thead>
    <tr style="text-align: center">
      <th>Bank</th>
      <th>Grade</th>
      <th>SSL 3</th>
      <th>TLS 1.2</th>
      <th>SHA1</th>
      <th>RC4</th>
      <th>Forward Secrecy</th>
      <th>POODLE</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=danskebank.dk">Danske Bank</a></td>
      <td class="grade-a">A-</td>
      <td class="pass">Pass</td>
      <td class="pass">Pass</td>
      <td class="pass">Pass</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="pass">Pass</td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=netbank.nordea.dk">Nordea</a></td>
      <td class="grade-b">B</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail<sup>1</sup></td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="pass">Pass</td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=dlr.dk">DLR Kredit</a></td>
      <td class="grade-c">C</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail<sup>2</sup></td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=portal.jyskebank.dk">Jyske Bank</a></td>
      <td class="grade-f">F</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=portal4.sydbank.dk">Sydbank</a></td>
      <td class="grade-f">F</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=mitnykredit.dk">Nykredit</a></td>
      <td class="grade-f">F</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail<sup>3</sup></td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
    </tr>
  </tbody>
</table>

<small><sup>1</sup>Nordea's SSL certificate is SHA256, but they use an SHA1 intermediate certificate</small>

<small><sup>2</sup>DLR receives a C overall, as only its SSL implementations are vulnerable to POODLE, but not its TLS implementation</small>

<small><sup>3</sup>Nykredit would pass, but they provide an unnecessary certificate which is signed using SHA1</small>

Only one bank, Danske Bank, managed to get an A (though it is an A-). This is mostly due to the lack of forward secrecy support. If they fix this they can increase their rating to an A. They are also the only bank to enable TLS 1.2 support, and disable the RC4 cipher.
 
Nordea comes in second, managing a B, with some very odd results. They only support the TLS 1.0 protocol, but the list of server preferred cipher suites starts with RC4 (which is insecure). The server also sent a certificate chain with an MD2 certificate in it! 
 
DLR Kredit achieves a C, despite the fact they are vulnerable to POODLE, because only their SSL 3 implementation is vulnerable. Their certificate is signed using SHA1, but stranger still their server didn't send any intermediate certificates. DLR Kredit is also the only bank which is vulnerable to the CRIME attack. This allows an attacker to read secure cookies sent by the server. Disabling TLS compression is all that is required to mitigate this.

Jyske Bank and Sydbank appear to use the same server configuration as their results are equally bad. They both have disabled SSL 3, and have a complete certificate chain signed using SHA256, but fail on all other tests. In addition, both banks are intolerant to TLS versions, meaning if their websites are badly written they may stop working when new TLS versions comes out.

Finally we have Nykredit, who fares worst of all. Their server sent unnecessary certificates, signed using SHA1, which causes them to fail this test. They only support TLS 1.0 and SSL 3, but their server's preferred cipher is RC4. Most worrying is the lack of support for secure renegotiation. This vulnerability is nearly 5 years old, and allows a man-in-the-middle to inject arbitrary content to an encrypted session.

Overall it's not looking too good. A lot of Denmark's biggest banks are not as secure as they would have you believe. Many are vulnerable to a lot of different avenues of attack - the most worrying being POODLE. These results are similar to those in Troy Hunt's original article, and just go to show that just because something is "bank grade" doesn't necessarily mean that it's actually good.