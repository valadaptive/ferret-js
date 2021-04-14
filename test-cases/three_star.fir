def i1 main {
    notaref = 4
    *i = 5
    *j = i
    *k = j

    **j = 6
    ***k = 7
    // i, j, k should all be 7 because they share an address
}